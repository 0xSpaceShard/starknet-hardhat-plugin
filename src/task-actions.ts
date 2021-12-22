import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, ABI_SUFFIX, ALPHA_TESTNET, ALPHA_MAINNET, ALPHA_TESTNET_INTERNALLY, ALPHA_MAINNET_INTERNALLY, VOYAGER_GOERLI_CONTRACT_API_URL, VOYAGER_MAINNET_CONTRACT_API_URL} from "./constants";
import { iterativelyCheckStatus, extractTxHash } from "./types";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { adaptLog,traverseFiles,checkArtifactExists } from "./utils";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";

function checkSourceExists(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
        const msg = `Source expected to be at ${sourcePath}, but not found.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}
function isTestnet(networkName: string): boolean {
    return networkName === ALPHA_TESTNET
        || networkName === ALPHA_TESTNET_INTERNALLY;
}

function isMainnet(networkName: string): boolean {
    return networkName === ALPHA_MAINNET
        || networkName === ALPHA_MAINNET_INTERNALLY;
}
/**
 * Transfers logs and generates a return status code.
 * 
 * @param executed The process result of running the container
 * @returns 0 if succeeded, 1 otherwise
 */
 function processExecuted(executed: ProcessResult): number {
    
    if (executed.stdout.length) {
        console.log(adaptLog(executed.stdout.toString()));
    }

    if (executed.stderr.length) {
        // synchronize param names reported by actual CLI with param names used by this plugin
        const err = executed.stderr.toString();
        const replacedErr = adaptLog(err);
        console.error(replacedErr);
    }

    return executed.statusCode ? 1 : 0;
}

function isStarknetCompilationArtifact(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch(err) {
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
    let gatewayUrl: string = args.gatewayUrl;
    let networkName: string = args.starknetNetwork || process.env.STARKNET_NETWORK;
    if (isMainnet(networkName)) {
        networkName = ALPHA_MAINNET_INTERNALLY;
    } else if (isTestnet(networkName)) {
        networkName = ALPHA_TESTNET_INTERNALLY;
    }
    if (gatewayUrl && !networkName) {
        return gatewayUrl;
    }

    if (gatewayUrl && networkName) {
        const msg = "Only one of starknet-network and gateway-url should be provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!networkName) { // we already know no gatewayUrl is provided
        const msg = "No starknet-network or gateway-url provided."
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    hre.starknet.network = networkName;
    const httpNetwork = <HttpNetworkConfig> hre.config.networks[networkName];
    if (!httpNetwork) {
        const msg = `Unknown starknet-network provided: ${networkName}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    return httpNetwork.url;
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
                cairoPath,
            });

            statusCode += processExecuted(executed);
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
                inputs: args.inputs ? args.inputs.split(/\s+/) : undefined,
            });
            if (args.wait) {
                const execResult = processExecuted(executed);
                if (execResult == 0) {
                    txHashes.push(extractTxHash(executed.stdout.toString()));
                }
                statusCode += execResult;
            }
            else {
                statusCode += processExecuted(executed);
            }
        }
    }

    if (args.wait) { // If the "wait" flag was passed as an argument, check the previously stored transaction hashes for their statuses
        console.log("Checking deployment transaction...");
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

export async function starknetVoyagerAction(args: any, hre: HardhatRuntimeEnvironment) {
    let voyagerUrl = VOYAGER_GOERLI_CONTRACT_API_URL;
        
        if (!isTestnet(args.starknetNetwork)) {
            if (isMainnet(args.starknetNetwork)) {
                voyagerUrl = VOYAGER_MAINNET_CONTRACT_API_URL;
            } else {
                const msg = `Unknown starknet-network provided: ${args.starknetNetwork}`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
        }

        voyagerUrl += args.address + "/code";
        let isVerified = false;
        try{
            const resp = await axios.get(voyagerUrl,{
                headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Content-Type': 'application/json'
                }
            });
            const data = resp.data;
            
            if(data.contract != null && data.contract.length > 0){
                isVerified = true;
            }
        }catch(error){
            const msg = `Something went wrong when trying to verify the code at address ${args.address}`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        
        if(isVerified){
            const msg =`Contract at address ${args.address} has already been verified`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        //If contract hasn't been verified yet, do it
        let contractPath = args.path;
        if (!path.isAbsolute(contractPath)) {
            contractPath = path.normalize(path.join(hre.config.paths.root, contractPath));
        }
        if (fs.existsSync(contractPath)) {
            const content = {code:fs.readFileSync(contractPath).toString().split(/\r?\n|\r/)};
            await axios.post(voyagerUrl,JSON.stringify(content)).catch(error=>{
                switch(error.response.status){
                    case 400:{
                        const msg = `Contract at address ${args.address} does not match the provided code`;
                        throw new HardhatPluginError(PLUGIN_NAME, msg);
                    }
                    case 500:{
                        const msg = `There is no contract deployed at address ${args.address}, or the transaction was not finished`;
                        throw new HardhatPluginError(PLUGIN_NAME, msg);
                    }
                    default:{
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