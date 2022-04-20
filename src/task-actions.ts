import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, ABI_SUFFIX, ALPHA_TESTNET, DEFAULT_STARKNET_NETWORK } from "./constants";
import { iterativelyCheckStatus, extractTxHash, InteractChoice } from "./types";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import {
    adaptLog,
    traverseFiles,
    checkArtifactExists,
    getNetwork,
    findPath,
    getAccountPath
} from "./utils";
import { HardhatRuntimeEnvironment, RunSuperFunction, TaskArguments } from "hardhat/types";
import { getWalletUtil } from "./extend-utils";

function checkSourceExists(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
        const msg = `Source expected to be at ${sourcePath}, but not found.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

/**
 * Transfers logs and generates a return status code.
 *
 * @param executed The process result of running the container
 * @returns 0 if succeeded, 1 otherwise
 */
function processExecuted(executed: ProcessResult, logStatus: boolean): number {
    if (executed.stdout.length) {
        console.log(adaptLog(executed.stdout.toString()));
    }

    if (executed.stderr.length) {
        // synchronize param names reported by actual CLI with param names used by this plugin
        const err = executed.stderr.toString();
        const replacedErr = adaptLog(err);
        console.error(replacedErr);
    }

    if (logStatus) {
        const finalMsg = executed.statusCode ? "Failed" : "Succeeded";
        console.log(`\t${finalMsg}\n`);
    }
    return executed.statusCode ? 1 : 0;
}

function isStarknetCompilationArtifact(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch (err) {
        return false;
    }

    return !!parsed.entry_points_by_type;
}

/**
 * First deletes the file if it already exists. Then creates an empty file at the provided path.
 * Unlinking/deleting is necessary if user switched from docker to venv.
 * @param filePath the file to be recreated
 */
function initializeFile(filePath: string) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    fs.closeSync(fs.openSync(filePath, "w"));
}

function getFileName(filePath: string) {
    return path.basename(filePath, path.extname(filePath));
}

/**
 * Extracts gatewayUrl from args or process.env.STARKNET_NETWORK.
 *
 * @param args the object containing CLI args
 * @param hre environment whose networks and starknet.network are accessed
 * @returns the URL of the gateway to be used; can return `undefined` if `required` set to `false`
 */
function getGatewayUrl(args: TaskArguments, hre: HardhatRuntimeEnvironment): string {
    const gatewayUrl: string = args.gatewayUrl;
    const networkName: string = args.starknetNetwork || process.env.STARKNET_NETWORK;

    if (gatewayUrl && !networkName) {
        return gatewayUrl;
    }

    if (gatewayUrl && networkName) {
        const msg = "Only one of starknet-network and gateway-url should be provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!networkName) {
        // we already know no gatewayUrl is provided
        const msg = "No starknet-network or gateway-url provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    const network = getNetwork(networkName, hre.config.networks, "starknet-network");
    return network.url;
}

export async function starknetCompileAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const root = hre.config.paths.root;
    const rootRegex = new RegExp("^" + root);

    const defaultSourcesPath = hre.config.paths.starknetSources;
    const sourcesPaths: string[] = args.paths || [defaultSourcesPath];
    const artifactsPath = hre.config.paths.starknetArtifacts;

    const cairoPaths = [defaultSourcesPath, root];
    if (args.cairoPath) {
        args.cairoPath.split(":").forEach((path: string) => {
            cairoPaths.push(path);
        });
    }
    if (hre.config.paths.cairoPaths) {
        hre.config.paths.cairoPaths.forEach((path: string) => {
            cairoPaths.push(path);
        });
    }
    for (let i = 0; i < cairoPaths.length; i++) {
        if (!path.isAbsolute(cairoPaths[i])) {
            cairoPaths[i] = path.normalize(path.join(root, cairoPaths[i]));
        }
    }

    const cairoPath = cairoPaths.join(":");
    let statusCode = 0;
    for (let sourcesPath of sourcesPaths) {
        if (!path.isAbsolute(sourcesPath)) {
            sourcesPath = path.normalize(path.join(root, sourcesPath));
        }
        checkSourceExists(sourcesPath);
        const files = await traverseFiles(sourcesPath, "*.cairo");
        for (const file of files) {
            console.log("Compiling", file);
            const suffix = file.replace(rootRegex, "");
            const fileName = getFileName(suffix);
            const dirPath = path.join(artifactsPath, suffix);
            const outputPath = path.join(dirPath, `${fileName}.json`);
            const abiPath = path.join(dirPath, `${fileName}${ABI_SUFFIX}`);

            fs.mkdirSync(dirPath, { recursive: true });
            initializeFile(outputPath);
            initializeFile(abiPath);

            const executed = await hre.starknetWrapper.compile({
                file,
                output: outputPath,
                abi: abiPath,
                cairoPath,
                accountContract: args.accountContract,
                disableHintValidation: args.disableHintValidation
            });

            statusCode += processExecuted(executed, true);
        }
    }

    if (statusCode) {
        const msg = `Failed compilation of ${statusCode} contract${statusCode === 1 ? "" : "s"}.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

export async function starknetDeployAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const gatewayUrl = getGatewayUrl(args, hre);
    const defaultArtifactsPath = hre.config.paths.starknetArtifacts;
    const artifactsPaths: string[] = args.paths || [defaultArtifactsPath];
    const intRegex = new RegExp(/^-?\d+$/);

    let statusCode = 0;
    const txHashes: string[] = [];
    for (let artifactsPath of artifactsPaths) {
        if (intRegex.test(artifactsPath)) {
            console.warn(
                `WARNING: found an integer "${artifactsPath}" as an artifact path. Make sure that all inputs are passed within a single string (e.g --inputs "10 20 30")`
            );
        }
        // Check if input is the name of the contract and not a path
        if (artifactsPath === path.basename(artifactsPath)) {
            const metadataSearchTarget = path.join(
                `${artifactsPath}.cairo`,
                `${path.basename(artifactsPath)}.json`
            );
            artifactsPath = await findPath(defaultArtifactsPath, metadataSearchTarget);
        } else if (!path.isAbsolute(artifactsPath)) {
            artifactsPath = path.normalize(path.join(hre.config.paths.root, artifactsPath));
        }
        checkArtifactExists(artifactsPath);
        const paths = await traverseFiles(artifactsPath, "*.json");
        const files = paths.filter(isStarknetCompilationArtifact);
        for (const file of files) {
            console.log("Deploying", file);
            const executed = await hre.starknetWrapper.deploy({
                contract: file,
                gatewayUrl,
                inputs: args.inputs?.split(/\s+/),
                salt: args.salt,
                token: args.token
            });
            if (args.wait) {
                const execResult = processExecuted(executed, false);
                if (execResult == 0) {
                    txHashes.push(extractTxHash(executed.stdout.toString()));
                }
                statusCode += execResult;
            } else {
                statusCode += processExecuted(executed, true);
            }
        }
    }

    if (args.wait) {
        // If the "wait" flag was passed as an argument, check the previously stored transaction hashes for their statuses
        console.log(`Checking deployment transaction${txHashes.length === 1 ? "" : "s"}...`);
        const promises = txHashes.map(
            (hash) =>
                new Promise<void>((resolve, reject) =>
                    iterativelyCheckStatus(
                        hash,
                        hre.starknetWrapper,
                        gatewayUrl,
                        gatewayUrl,
                        (status) => {
                            console.log(`Deployment transaction ${hash} is now ${status}`);
                            resolve();
                        },
                        (error) => {
                            console.log(`Deployment transaction ${hash} is REJECTED`);
                            reject(error);
                        }
                    )
                )
        );
        await Promise.allSettled(promises);
    }

    if (statusCode) {
        throw new HardhatPluginError(PLUGIN_NAME, `Failed deployment of ${statusCode} contracts`);
    }
}

/**
 * Extracts the verification URL assigned to the network provided.
 * If no `networkName` is provided, defaults to Alpha testnet.
 * If `networkName` is provided, but not supported for verification, an error is thrown.
 * @param networkName the name of the network
 * @param hre the runtime environment from which network data is extracted
 * @param origin short string describing where/how `networkName` was specified
 */
function getVerificationUrl(networkName: string, hre: HardhatRuntimeEnvironment, origin: string) {
    networkName ||= ALPHA_TESTNET;
    const network = getNetwork(networkName, hre.config.networks, origin);
    if (!network.verificationUrl) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Network ${networkName} does not support Voyager verification.`
        );
    }
    return network.verificationUrl;
}

export async function starknetVoyagerAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const verificationUrl = getVerificationUrl(args.starknetNetwork, hre, "starknet-network");
    const voyagerUrl = `${verificationUrl}${args.address}/code`;
    let isVerified = false;
    try {
        const resp = await axios.get(voyagerUrl, {
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Content-Type": "application/json"
            }
        });
        const data = resp.data;

        if (data.contract) {
            if (data.contract.length > 0 || Object.keys(data.contract).length > 0) {
                isVerified = true;
            }
        }
    } catch (error) {
        const msg = `Something went wrong when trying to verify the code at address ${args.address}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (isVerified) {
        console.log(`Contract at address ${args.address} has already been verified`);
    } else {
        await handleContractVerification(args, voyagerUrl, hre);
    }
}

async function handleContractVerification(
    args: TaskArguments,
    voyagerUrl: string,
    hre: HardhatRuntimeEnvironment
) {
    // Set main contract path
    let contractPath = args.path;
    if (!path.isAbsolute(contractPath)) {
        contractPath = path.normalize(path.join(hre.config.paths.root, contractPath));
        if (!fs.existsSync(contractPath)) {
            throw new HardhatPluginError(PLUGIN_NAME, `File ${contractPath} does not exist`);
        }
    }
    // The other option for the formData would be to add a new dependency 'form-data', but the URLSearchParams works exactly the same
    const bodyFormData = new URLSearchParams();
    bodyFormData.append("contract-name", path.parse(contractPath).base);

    // If the contract has dependencies, insert them into the form
    if (args.paths) {
        handleMultiPartContractVerification(bodyFormData, contractPath, args, hre);
    } else {
        handleSingleContractVerification(bodyFormData, contractPath);
    }

    await axios.post(voyagerUrl, bodyFormData).catch((error) => {
        switch (error.response.status) {
            case 400: {
                const msg = `Contract at address ${args.address} does not match the provided code`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            case 500: {
                const msg = `There is no contract deployed at address ${args.address}, or the transaction was not finished`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            default: {
                const msg = `Something went wrong when trying to verify the code at address ${args.address}`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
        }
    });
    console.log(`Contract has been successfuly verified at address ${args.address}`);
}

function handleSingleContractVerification(bodyFormData: URLSearchParams, contractPath: string) {
    const file = fs.readFileSync(contractPath);
    const fileContent = file.toString().split(/\r?\n|\r/);
    bodyFormData.append("code", JSON.stringify(fileContent));
}

function handleMultiPartContractVerification(
    bodyFormData: URLSearchParams,
    contractPath: string,
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    bodyFormData.append("filename", path.parse(contractPath).base);
    bodyFormData.append("file", fs.readFileSync(contractPath).toString());

    args.paths.forEach(function (item: string, index: number) {
        if (!path.isAbsolute(item)) {
            args.paths[index] = path.normalize(path.join(hre.config.paths.root, item));
            if (!fs.existsSync(args.paths[index])) {
                throw new HardhatPluginError(
                    PLUGIN_NAME,
                    `File ${args.paths[index]} does not exist`
                );
            }
            bodyFormData.append("filename", path.parse(args.paths[index]).base);
            bodyFormData.append("file", fs.readFileSync(args.paths[index]).toString());
        }
    });
}

export async function starknetInvokeAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    await starknetInteractAction(InteractChoice.INVOKE, args, hre);
}

export async function starknetCallAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    await starknetInteractAction(InteractChoice.CALL, args, hre);
}

export async function starknetEstimateFeeAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    await starknetInteractAction(InteractChoice.ESTIMATE_FEE, args, hre);
}

async function starknetInteractAction(
    choice: InteractChoice,
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    const gatewayUrl = getGatewayUrl(args, hre);
    const contractFactory = await hre.starknet.getContractFactory(args.contract, gatewayUrl);
    const abiPath = contractFactory.getAbiPath();

    let wallet, accountDir;
    if (args.wallet) {
        wallet = getWalletUtil(args.wallet, hre);
        accountDir = getAccountPath(wallet.accountPath, hre);
    }

    const executed = await hre.starknetWrapper.interact({
        choice: choice,
        address: args.address,
        abi: abiPath,
        functionName: args.function,
        inputs: args.inputs ? args.inputs.split(/\s+/) : undefined,
        signature: args.signature,
        wallet: wallet ? wallet.modulePath : undefined,
        account: wallet ? wallet.accountName : undefined,
        accountDir: wallet ? accountDir : undefined,
        gatewayUrl: gatewayUrl,
        feederGatewayUrl: gatewayUrl,
        blockNumber: args.blockNumber ? args.blockNumber : undefined,
        networkID: wallet ? args.starknetNetwork : undefined,
        maxFee: args.maxFee ? args.maxFee : undefined,
        nonce: args.nonce ? args.nonce : undefined
    });

    const statusCode = processExecuted(executed, true);

    if (statusCode) {
        const msg =
            `Could not perform ${choice.cliCommand} of ${args.function}:\n` +
            executed.stderr.toString();
        const replacedMsg = adaptLog(msg);
        throw new HardhatPluginError(PLUGIN_NAME, replacedMsg);
    }

    if (choice === InteractChoice.INVOKE && args.wait) {
        // If the "wait" flag was passed as an argument, check the transaction hash for its status
        console.log("Checking transaction...");
        const executedOutput = executed.stdout.toString();
        const txHash = extractTxHash(executedOutput);
        await new Promise<void>((resolve, reject) =>
            iterativelyCheckStatus(
                txHash,
                hre.starknetWrapper,
                gatewayUrl,
                gatewayUrl,
                (status) => {
                    console.log(`Invoke transaction ${txHash} is now ${status}`);
                    resolve();
                },
                (error) => {
                    console.error(`Invoke transaction ${txHash} is REJECTED`);
                    reject(error);
                }
            )
        );
    }
}

export async function starknetDeployAccountAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    const gatewayUrl = getGatewayUrl(args, hre);
    const wallet = getWalletUtil(args.wallet, hre);
    const accountDir = getAccountPath(wallet.accountPath, hre);

    fs.mkdirSync(accountDir, { recursive: true });

    const executed = await hre.starknetWrapper.deployAccount({
        accountDir: accountDir,
        accountName: wallet.accountName,
        feederGatewayUrl: gatewayUrl,
        gatewayUrl: gatewayUrl,
        network: args.starknetNetwork,
        wallet: wallet.modulePath
    });

    const statusCode = processExecuted(executed, true);

    if (statusCode) {
        const msg = "Could not deploy account contract:\n" + executed.stderr.toString();
        const replacedMsg = adaptLog(msg);
        throw new HardhatPluginError(PLUGIN_NAME, replacedMsg);
    }
}

/**
 * Used later on for network interaction.
 * @param args Hardhat CLI args
 * @param hre HardhatRuntimeEnvironment
 */
function setRuntimeNetwork(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    let networkName;
    let networkConfig;
    if (args.starknetNetwork) {
        networkName = args.starknetNetwork;
        networkConfig = getNetwork(networkName, hre.config.networks, "--starknet-network");
    } else if (hre.config.starknet.network) {
        networkName = hre.config.starknet.network;
        networkConfig = getNetwork(
            networkName,
            hre.config.networks,
            "starknet.network in hardhat.config"
        );
    } else {
        networkName = DEFAULT_STARKNET_NETWORK;
        networkConfig = getNetwork(networkName, hre.config.networks, "default settings");
    }
    hre.config.starknet.network = hre.starknet.network = networkName;
    hre.config.starknet.networkUrl = hre.starknet.networkUrl = networkConfig.url;
    hre.config.starknet.networkConfig = networkConfig;
    console.log(`Using network ${hre.starknet.network} at ${hre.starknet.networkUrl}`);
}

export async function starknetTestAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>
) {
    setRuntimeNetwork(args, hre);
    await runSuper(args);
}
