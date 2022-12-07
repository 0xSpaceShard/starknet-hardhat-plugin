import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import FormData = require("form-data");
import { StarknetPluginError } from "./starknet-plugin-error";
import { ABI_SUFFIX, ALPHA_TESTNET, DEFAULT_STARKNET_NETWORK } from "./constants";
import { iterativelyCheckStatus, extractTxHash, InteractChoice } from "./types";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import {
    adaptLog,
    traverseFiles,
    checkArtifactExists,
    getNetwork,
    findPath,
    getAccountPath,
    isStarknetDevnet,
    warn
} from "./utils";
import {
    HardhatNetworkConfig,
    HardhatRuntimeEnvironment,
    HttpNetworkConfig,
    RunSuperFunction,
    TaskArguments
} from "hardhat/types";
import { getWalletUtil } from "./extend-utils";
import { createIntegratedDevnet } from "./external-server";
import { Recompiler } from "./recompiler";
import { version } from "../package.json";

function checkSourceExists(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
        const msg = `Source expected to be at ${sourcePath}, but not found.`;
        throw new StarknetPluginError(msg);
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
        const recompiler = new Recompiler(hre);
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

            // Update cache after compilation
            await recompiler.updateCache(args, file, outputPath, abiPath, cairoPath);
            statusCode += processExecuted(executed, true);
        }
        await recompiler.saveCache();
    }

    if (statusCode) {
        const msg = `Failed compilation of ${statusCode} contract${statusCode === 1 ? "" : "s"}.`;
        throw new StarknetPluginError(msg);
    }
}

// TODO how should network setting be handled for tasks other than test and run?

export async function starknetDeployAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    await new Recompiler(hre).handleCache();
    const defaultArtifactsPath = hre.config.paths.starknetArtifacts;
    const artifactsPaths: string[] = args.paths || [defaultArtifactsPath];
    const intRegex = new RegExp(/^-?\d+$/);

    let statusCode = 0;
    const txHashes: string[] = [];
    for (let artifactsPath of artifactsPaths) {
        if (intRegex.test(artifactsPath)) {
            warn(
                `Warning! Found an integer "${artifactsPath}" as an artifact path.\n` +
                    "Make sure that all inputs are passed within a single string (e.g --inputs '10 20 30')"
            );
        }

        // Check if input is the name of the contract and not a path
        if (artifactsPath === path.basename(artifactsPath)) {
            const metadataSearchTarget = path.join(
                `${artifactsPath}.cairo`,
                `${path.basename(artifactsPath)}.json`
            );
            const foundPath = await findPath(defaultArtifactsPath, metadataSearchTarget);
            artifactsPath = foundPath || metadataSearchTarget;
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
        throw new StarknetPluginError(`Failed deployment of ${statusCode} contracts`);
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
function getVerificationNetwork(
    networkName: string,
    hre: HardhatRuntimeEnvironment,
    origin: string
) {
    networkName ||= ALPHA_TESTNET;
    const network = getNetwork<HttpNetworkConfig>(networkName, hre.config.networks, origin);
    if (!network.verificationUrl) {
        throw new StarknetPluginError(
            `Network ${networkName} does not support Voyager verification.`
        );
    }
    return network;
}

export async function starknetVoyagerAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const network = getVerificationNetwork(args.starknetNetwork, hre, "--starknet-network");
    const voyagerUrl = `${network.verificationUrl}${args.address}/code`;
    const verifiedUrl = `${network.verifiedUrl}${args.address}#code`;

    let isVerified = false;
    try {
        const resp = await axios.get(voyagerUrl);
        const data = resp.data;

        if (data.contract) {
            if (data.contract.length > 0 || Object.keys(data.contract).length > 0) {
                isVerified = true;
            }
        }
    } catch (error) {
        const msg =
            "Something went wrong while checking if the contract has already been verified.";
        throw new StarknetPluginError(msg);
    }

    if (isVerified) {
        console.log(`Contract at address ${args.address} has already been verified`);
        console.log(`Check it out on Voyager: ${verifiedUrl}`);
    } else {
        await handleContractVerification(args, voyagerUrl, verifiedUrl, hre);
    }
}

function getMainVerificationPath(contractPath: string, root: string) {
    if (!path.isAbsolute(contractPath)) {
        contractPath = path.normalize(path.join(root, contractPath));
        if (!fs.existsSync(contractPath)) {
            throw new StarknetPluginError(`File ${contractPath} does not exist`);
        }
    }
    return contractPath;
}

async function handleContractVerification(
    args: TaskArguments,
    voyagerUrl: string,
    verifiedUrl: string,
    hre: HardhatRuntimeEnvironment
) {
    // Set main contract path
    const mainPath = getMainVerificationPath(args.path, hre.config.paths.root);
    const paths = [mainPath];

    const bodyFormData = new FormData();
    bodyFormData.append("compiler-version", args.compilerVersion);
    const accountContract = args.accountContract ? "true" : "false";
    bodyFormData.append("account-contract", accountContract);
    bodyFormData.append("license", args.license || "No License (None)");

    // Dependencies (non-main contracts) are in args.paths
    if (args.paths) {
        paths.push(...args.paths);
    }

    const sourceRegex = new RegExp("^" + hre.config.paths.starknetSources + "/");
    const contractNameDefault = mainPath.replace(sourceRegex, "");
    // If contract name is not provided, use the default
    bodyFormData.append("contract-name", contractNameDefault);
    // Appends all contracts to the form data with the name "file" + index
    handleMultiPartContractVerification(bodyFormData, paths, hre.config.paths.root, sourceRegex);

    await axios
        .post(voyagerUrl, bodyFormData.getBuffer(), {
            headers: bodyFormData.getHeaders()
        })
        .catch((err) => {
            throw new StarknetPluginError(
                `\
Could not verify the contract at address ${args.address}.
${
    err.response.data.message ||
    `It is hard to tell exactly what happened, but possible reasons include:
- Deployment transaction hasn't been accepted or indexed yet (check its tx_status or try in a minute)
- Wrong contract address
- Wrong files provided
- Wrong main contract chosen (first after --path)
- Voyager is down`
}
            `
            );
        });

    console.log(`Contract has been successfuly verified at address ${args.address}`);
    console.log(`Check it out on Voyager: ${verifiedUrl}`);
}

function handleMultiPartContractVerification(
    bodyFormData: FormData,
    paths: string[],
    root: string,
    sourceRegex: RegExp
) {
    paths.forEach(function (item: string, index: number) {
        if (!path.isAbsolute(item)) {
            paths[index] = path.normalize(path.join(root, item));
            if (!fs.existsSync(paths[index])) {
                throw new StarknetPluginError(`File ${paths[index]} does not exist`);
            }
        }
        bodyFormData.append("file" + index, fs.readFileSync(paths[index]), {
            filepath: paths[index].replace(sourceRegex, ""),
            contentType: "application/octet-stream"
        });
    });
}

export async function starknetInvokeAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    await new Recompiler(hre).handleCache();
    await starknetInteractAction(InteractChoice.INVOKE, args, hre);
}

export async function starknetCallAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    await new Recompiler(hre).handleCache();
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
    const contractFactory = await hre.starknet.getContractFactory(args.contract);
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
        signature: args.signature?.split(/\s+/),
        wallet: wallet ? wallet.modulePath : undefined,
        account: wallet ? wallet.accountName : undefined,
        accountDir: wallet ? accountDir : undefined,
        blockNumber: args.blockNumber ? args.blockNumber : undefined,
        maxFee: args.maxFee ? args.maxFee : undefined,
        nonce: args.nonce ? args.nonce : undefined
    });

    const statusCode = processExecuted(executed, true);

    if (statusCode) {
        const msg =
            `Could not perform ${choice.internalCommand} of ${args.function}:\n` +
            executed.stderr.toString();
        const replacedMsg = adaptLog(msg);
        throw new StarknetPluginError(replacedMsg);
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
                (status) => {
                    console.log(`Invoke transaction ${txHash} is now ${status}`);
                    resolve();
                },
                (error) => {
                    reject(new StarknetPluginError(`Invoke transaction ${txHash}: ${error}`));
                }
            )
        );
    }
}

export async function starknetNewAccountAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    const wallet = getWalletUtil(args.wallet, hre);
    const accountDir = getAccountPath(wallet.accountPath, hre);

    fs.mkdirSync(accountDir, { recursive: true });

    warn(
        "Warning! You are creating a modified version of OZ account which may not be compatible with the Account class."
    );

    const executed = await hre.starknetWrapper.newAccount({
        accountDir: accountDir,
        accountName: wallet.accountName,
        network: args.starknetNetwork,
        wallet: wallet.modulePath
    });

    const statusCode = processExecuted(executed, true);

    if (statusCode) {
        const msg = "Could not create a new account contract:\n" + executed.stderr.toString();
        const replacedMsg = adaptLog(msg);
        throw new StarknetPluginError(replacedMsg);
    }
}

export async function starknetDeployAccountAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    const wallet = getWalletUtil(args.wallet, hre);
    const accountDir = getAccountPath(wallet.accountPath, hre);

    fs.mkdirSync(accountDir, { recursive: true });

    warn(
        "Warning! You are deploying a modified version of OZ account which may not be compatible with the Account class."
    );

    const executed = await hre.starknetWrapper.deployAccount({
        accountDir: accountDir,
        accountName: wallet.accountName,
        network: args.starknetNetwork,
        wallet: wallet.modulePath
    });

    const statusCode = processExecuted(executed, true);

    if (statusCode) {
        const msg = "Could not deploy account contract:\n" + executed.stderr.toString();
        const replacedMsg = adaptLog(msg);
        throw new StarknetPluginError(replacedMsg);
    }
}

/**
 * Used later on for network interaction.
 * @param args Hardhat CLI args
 * @param hre HardhatRuntimeEnvironment
 */
function setRuntimeNetwork(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    let networkName;
    let networkConfig: HardhatNetworkConfig;
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

    hre.starknet.network = networkName;
    hre.starknet.networkConfig = networkConfig;
    console.log(`Using network ${hre.starknet.network} at ${hre.starknet.networkConfig.url}`);
}

async function runWithDevnet(hre: HardhatRuntimeEnvironment, fn: () => Promise<unknown>) {
    if (!isStarknetDevnet(hre.starknet.network)) {
        await fn();
        return;
    }

    const devnet = createIntegratedDevnet(hre);

    await devnet.start();
    await fn();
    devnet.stop();
}

export async function starknetTestAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>
) {
    await new Recompiler(hre).handleCache();
    setRuntimeNetwork(args, hre);

    await runWithDevnet(hre, async () => {
        await runSuper(args);
    });
}

export async function starknetRunAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>
) {
    await new Recompiler(hre).handleCache();
    if (args.starknetNetwork) {
        throw new StarknetPluginError(`Using "--starknet-network" with "hardhat run" currently does not have effect.
Use the "network" property of the "starknet" object in your hardhat config file.`);
    }
    setRuntimeNetwork(args, hre);

    await runWithDevnet(hre, async () => {
        await runSuper(args);
    });
}

export async function starknetPluginVersionAction() {
    console.log(`Version: ${version}`);
}

export async function starknetMigrateAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    if (!args.paths || args.paths.length < 1) {
        throw new StarknetPluginError("Expected at least one file to migrate");
    }

    const root = hre.config.paths.root;
    const defaultSourcesPath = hre.config.paths.starknetSources;
    const files: string[] = args.paths || [defaultSourcesPath];
    const cairoFiles: string[] = [];
    for (let file of files) {
        if (!path.isAbsolute(file)) {
            file = path.normalize(path.join(root, file));
        }
        cairoFiles.push(file);
    }

    const result = await hre.starknetWrapper.migrateContract({
        files: cairoFiles,
        inplace: args.inplace
    });

    processExecuted(result, true);
}
