import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { StarknetContractFactory, iterativelyCheckStatus, extractTxHash } from "./types";
import { PLUGIN_NAME, ABI_SUFFIX, DEFAULT_STARKNET_SOURCES_PATH, DEFAULT_STARKNET_ARTIFACTS_PATH, DEFAULT_DOCKER_IMAGE_TAG, DOCKER_REPOSITORY, DEFAULT_STARKNET_NETWORK, ALPHA_URL, ALPHA_MAINNET_URL, VOYAGER_GOERLI_CONTRACT_API_URL, VOYAGER_MAINNET_CONTRACT_API_URL, ALPHA_MAINNET, ALPHA_TESTNET, ALPHA_TESTNET_INTERNALLY, ALPHA_MAINNET_INTERNALLY} from "./constants";
import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig, HttpNetworkConfig } from "hardhat/types";
import { adaptLog, getDefaultHttpNetworkConfig } from "./utils";
import { DockerWrapper, VenvWrapper } from "./starknet-wrappers";
import { glob } from "glob";
import { promisify } from "util";

const globPromise = promisify(glob);

function checkSourceExists(sourcePath: string): void {
    if (!fs.existsSync(sourcePath)) {
        const msg = `Source expected to be at ${sourcePath}, but not found.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

function checkArtifactExists(artifactsPath: string): void {
    if (!fs.existsSync(artifactsPath)) {
        const msg = `Artifact expected to be at ${artifactsPath}, but not found. Consider recompiling your contracts.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

async function traverseFiles(traversable: string, fileCriteria: string = "*") {
    let paths: string[] = [];
    if (fs.lstatSync(traversable).isDirectory()) {
        paths = await globPromise(path.join(traversable, "**", fileCriteria));
    }
    else {
        paths.push(traversable);
    }
    const files = paths.filter(file => { return fs.lstatSync(file).isFile(); });
    return files;
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

    const finalMsg = executed.statusCode ? "Failed" : "Succeeded";
    console.log(`\t${finalMsg}\n`);
    return executed.statusCode ? 1 : 0;
}

function hasCairoExtension(filePath: string) {
    return path.extname(filePath) === ".cairo";
}

function isStarknetContract(filePath: string) {
    return hasCairoExtension(filePath);
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

function getFileName(filePath: string) {
    return path.basename(filePath, path.extname(filePath));
}

// add sources path
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetSources) {
        const userPath = userConfig.paths.starknetSources;
        if (path.isAbsolute(userPath)) {
            newPath = userPath;
        } else {
            newPath = path.normalize(path.join(config.paths.root, userPath));
        }
        config.paths.starknetSources = userConfig.paths.starknetSources;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_SOURCES_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetSources = newPath;
});

// add artifacts path
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetArtifacts) {
        const userPath = userConfig.paths.starknetArtifacts;
        if (path.isAbsolute(userPath)) {
            newPath = userPath;
        } else {
            newPath = path.normalize(path.join(config.paths.root, userPath));
        }
        config.paths.starknetArtifacts = userConfig.paths.starknetArtifacts;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_ARTIFACTS_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetArtifacts = newPath;
});

// add user-defined cairo settings
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    if (userConfig.cairo) {
        config.cairo = JSON.parse(JSON.stringify(userConfig.cairo));
    }
    if (!config.cairo) {
        config.cairo = {};
    }
});

// add url to alpha network
extendConfig((config: HardhatConfig) => {
    if (!config.networks.alpha) {
        config.networks.alpha = getDefaultHttpNetworkConfig(ALPHA_URL);
    }

    if (!config.networks.alphaMainnet) {
        config.networks.alphaMainnet = getDefaultHttpNetworkConfig(ALPHA_MAINNET_URL);
    }
});

// add venv wrapper or docker wrapper of starknet
extendEnvironment(hre => {
    const venvPath = hre.config.cairo.venv;
    if (venvPath) {
        if (hre.config.cairo.version) {
            const msg = "Error in config file. Only one of (cairo.version, cairo.venv) can be specified.";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        hre.starknetWrapper = new VenvWrapper(venvPath);
    } else {
        const repository = DOCKER_REPOSITORY;
        const tag = hre.config.cairo.version || DEFAULT_DOCKER_IMAGE_TAG;
        hre.starknetWrapper = new DockerWrapper({ repository, tag });
    }
});

task("starknet-compile", "Compiles Starknet contracts")
    .addOptionalVariadicPositionalParam("paths",
        "The paths to be used for deployment.\n" +
        "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
        "If no paths are provided, the default contracts directory is traversed."
    )
    .addOptionalParam("cairoPath",
        "Allows specifying the locations of imported files, if necessary.\n" +
        "Separate them with a colon (:), e.g. --cairo-path='path/to/lib1:path/to/lib2'"
    )
    .setAction(async (args, hre) => {
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
            const files = await traverseFiles(sourcesPath,"*.cairo");
            for(const file of files){
                console.log("Compiling", file);
                const suffix = file.replace(rootRegex, "");
                const fileName = getFileName(suffix);
                const dirPath = path.join(artifactsPath, suffix);
                const outputPath = path.join(dirPath, `${fileName}.json`);
                const abiPath = path.join(dirPath, `${fileName}${ABI_SUFFIX}`);
                const cairoPath = (defaultSourcesPath + ":" + root) + (args.cairoPath ? ":" + args.cairoPath : "");

                // unlinking/deleting is necessary if user switched from docker to venv
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                if (fs.existsSync(abiPath)) {
                    fs.unlinkSync(abiPath);
                }
                fs.mkdirSync(dirPath, { recursive: true });
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
    });

function isTestnet(networkName: string): boolean {
    return networkName === ALPHA_TESTNET
        || networkName === ALPHA_TESTNET_INTERNALLY;
}

function isMainnet(networkName: string): boolean {
    return networkName === ALPHA_MAINNET
        || networkName === ALPHA_MAINNET_INTERNALLY;
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

task("starknet-deploy", "Deploys Starknet contracts which have been compiled.")
    .addFlag("wait", "Wait for deployment transaction to be at least ACCEPTED_ON_L2")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", `The URL of the gateway to be used (e.g. ${ALPHA_URL})`)
    .addOptionalParam("inputs",
        "Space separated values forming constructor input.\n" +
        "Pass them as a single string; e.g. --inputs \"1 2 3\"\n" +
        "You would typically use this feature when deploying a single contract.\n" +
        "If you're deploying multiple contracts, they'll all use the same input."
    ).addOptionalVariadicPositionalParam("paths",
        "The paths to be used for deployment.\n" +
        "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
        "If no paths are provided, the default artifacts directory is traversed."
    ).setAction(async (args, hre) => {
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
            const paths = await traverseFiles(artifactsPath,"*.json");
            const files = paths.filter(isStarknetCompilationArtifact);
            for(const file of files){
                console.log("Deploying", file);
                const executed = await hre.starknetWrapper.deploy({
                    contract: file,
                    gatewayUrl,
                    inputs: args.inputs.split(/\s+/),
                });
                if(args.wait){
                    const execResult = processExecuted(executed);
                    if(execResult == 0){
                        txHashes.push(extractTxHash(executed.stdout.toString()));
                    }
                    statusCode += execResult;
                } 
                else {
                    statusCode += processExecuted(executed);
                }
            }
        }

        if (args.wait){ // If the "wait" flag was passed as an argument, check the previously stored transaction hashes for their statuses
            console.log("Checking deployment transactions...");
            const promises = txHashes.map( hash => new Promise<void>((resolve, reject) => iterativelyCheckStatus(
                hash, 
                hre.starknetWrapper, 
                gatewayUrl, 
                gatewayUrl, 
                () => {
                    console.log("Deployment transaction " + hash + " status is now at least PENDING");
                    resolve();
                },
                (error) => {
                    console.log("Deployment transaction " + hash + " status is REJECTED");
                    reject(error);
                }
            )));
            await Promise.allSettled(promises);
        }

        if (statusCode) {
            throw new HardhatPluginError(PLUGIN_NAME, `Failed deployment of ${statusCode} contracts`);
        }
    });

async function findPath(traversable: string, name: string) {
    let files = await traverseFiles(traversable);
    files = files.filter(f => f.endsWith(name));
    if (files.length == 0){
        return null;
    }
    else if (files.length == 1){
        return files[0];
    }
    else {
        const msg = "More than one file was found because the path provided is ambiguous, please specify a relative path";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

extendEnvironment(hre => {
    hre.starknet = {
        getContractFactory: async contractPath => {
            const artifactsPath = hre.config.paths.starknetArtifacts;
            checkArtifactExists(artifactsPath);

            contractPath  = contractPath.replace(/\.[^/.]+$/, "");

            let searchTarget = path.join(`${contractPath}.cairo`,`${path.basename(contractPath)}.json`);
            const metadataPath = await findPath(artifactsPath,searchTarget);
            if (!metadataPath) {
                throw new HardhatPluginError(PLUGIN_NAME, `Could not find metadata for ${contractPath}`);
            }

            searchTarget = path.join(`${contractPath}.cairo`,`${path.basename(contractPath)}${ABI_SUFFIX}`);
            const abiPath = await findPath(artifactsPath,searchTarget);
            if (!abiPath) {
                throw new HardhatPluginError(PLUGIN_NAME, `Could not find ABI for ${contractPath}`);
            }

            const testNetworkName = hre.config.mocha.starknetNetwork || DEFAULT_STARKNET_NETWORK;
            const testNetwork: HttpNetworkConfig = <HttpNetworkConfig> hre.config.networks[testNetworkName];
            if (!testNetwork) {
                const msg = `Network ${testNetworkName} is specified under "mocha.starknetNetwork", but not defined in "networks".`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }

            if (!testNetwork.url) {
                throw new HardhatPluginError(PLUGIN_NAME, `Cannot use network ${testNetworkName}. No "url" specified.`);
            }

            return new StarknetContractFactory({
                starknetWrapper: hre.starknetWrapper,
                metadataPath,
                abiPath,
                gatewayUrl: testNetwork.url,
                feederGatewayUrl: testNetwork.url
            });
        }
    };
});

task("starknet-verify", "Verifies the contract in the Starknet network.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addParam("path", `The path of the cairo contract (e.g. contracts/conract.cairo)`)
    .addParam("address", `The address where the contract is deployed`)
    .setAction(async (args, hre) => {
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

    });
