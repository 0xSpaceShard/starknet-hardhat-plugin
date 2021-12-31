import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, ABI_SUFFIX, ALPHA_TESTNET } from "./constants";
import { iterativelyCheckStatus, extractTxHash } from "./types";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { adaptLog, traverseFiles, checkArtifactExists, getNetwork } from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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
 * Extracts gatewayUrl from args or process.env.STARKNET_NETWORK. Sets hre.starknet.network if provided.
 *
 * @param args the object containing CLI args
 * @param hre environment whose networks and starknet.network are accessed
 * @returns the URL of the gateway to be used
 */
function getGatewayUrl(args: any, hre: HardhatRuntimeEnvironment): string {
    const gatewayUrl: string = args.gatewayUrl;
    const networkName: string = args.starknetNetwork || process.env.STARKNET_NETWORK;

    if (gatewayUrl && !networkName) {
        return gatewayUrl;
    }

    if (gatewayUrl && networkName) {
        const msg = "Only one of starknet-network and gateway-url should be provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!networkName) { // we already know no gatewayUrl is provided
        const msg = "No starknet-network or gateway-url provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    const network = getNetwork(networkName, hre, "starknet-network");
    hre.starknet.network = networkName;
    return network.url;
}

export async function starknetCompileAction(args: any, hre: HardhatRuntimeEnvironment) {
    const root = hre.config.paths.root;
    const rootRegex = new RegExp("^" + root);

    const defaultSourcesPath = hre.config.paths.starknetSources;
    const sourcesPaths: string[] = args.paths || [defaultSourcesPath];
    const artifactsPath = hre.config.paths.starknetArtifacts;

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
            const cairoPath = (defaultSourcesPath + ":" + root) + (args.cairoPath ? ":" + args.cairoPath : "");

            fs.mkdirSync(dirPath, { recursive: true });
            initializeFile(outputPath);
            initializeFile(abiPath);

            const executed = await hre.starknetWrapper.compile({
                file,
                output: outputPath,
                abi: abiPath,
                cairoPath
            });

            statusCode += processExecuted(executed, true);
        }
    }

    if (statusCode) {
        const msg = `Failed compilation of ${statusCode} contract${statusCode === 1 ? "" : "s"}.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}


export async function starknetDeployAction(args: any, hre: HardhatRuntimeEnvironment) {
    const gatewayUrl = getGatewayUrl(args, hre);
    const defaultArtifactsPath = hre.config.paths.starknetArtifacts;
    const artifactsPaths: string[] = args.paths || [defaultArtifactsPath];

    let statusCode = 0;
    const txHashes: string[] = [];
    for (let artifactsPath of artifactsPaths) {
        if (!path.isAbsolute(artifactsPath)) {
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
                inputs: args.inputs ? args.inputs.split(/\s+/) : undefined
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

    if (args.wait) { // If the "wait" flag was passed as an argument, check the previously stored transaction hashes for their statuses
        console.log(`Checking deployment transaction${txHashes.length === 1 ? "" : "s"}...`);
        const promises = txHashes.map(hash => new Promise<void>((resolve, reject) => iterativelyCheckStatus(
            hash,
            hre.starknetWrapper,
            gatewayUrl,
            gatewayUrl,
            status => {
                console.log(`Deployment transaction ${hash} is now ${status}`);
                resolve();
            },
            error => {
                console.log(`Deployment transaction ${hash} is REJECTED`);
                reject(error);
            }
        )));
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
    const network = getNetwork(networkName, hre, origin);
    if (!network.verificationUrl) {
        throw new HardhatPluginError(PLUGIN_NAME, `Network ${networkName} does not support Voyager verification.`);
    }
    return network.verificationUrl;
}

export async function starknetVoyagerAction(args: any, hre: HardhatRuntimeEnvironment) {
    const verificationUrl = getVerificationUrl(args.starknetNetwork, hre, "starknet-network");
    const voyagerUrl = `${verificationUrl}${args.address}/code`;
    let isVerified = false;
    try {
        const resp = await axios.get(voyagerUrl, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Content-Type": "application/json"
            }
        });
        const data = resp.data;

        if (data.contract != null && data.contract.length > 0) {
            isVerified = true;
        }
    } catch (error) {
        const msg = `Something went wrong when trying to verify the code at address ${args.address}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (isVerified) {
        const msg =`Contract at address ${args.address} has already been verified`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
    //If contract hasn't been verified yet, do it
    let contractPath = args.path;
    if (!path.isAbsolute(contractPath)) {
        contractPath = path.normalize(path.join(hre.config.paths.root, contractPath));
    }
    if (fs.existsSync(contractPath)) {
        const content = { code: fs.readFileSync(contractPath).toString().split(/\r?\n|\r/) };
        await axios.post(voyagerUrl, JSON.stringify(content)).catch(error=>{
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
        return;
    } else {
        throw new HardhatPluginError(PLUGIN_NAME, `File ${contractPath} does not exist`);
    }
}
