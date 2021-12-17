import * as path from "path";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import "./type-extensions";
import { StarknetContractFactory } from "./types";
import { PLUGIN_NAME, ABI_SUFFIX, DEFAULT_STARKNET_SOURCES_PATH, DEFAULT_STARKNET_ARTIFACTS_PATH, DEFAULT_DOCKER_IMAGE_TAG, DOCKER_REPOSITORY, DEFAULT_STARKNET_NETWORK, ALPHA_URL, ALPHA_MAINNET_URL, SHORT_STRING_MAX_CHARACTERS, CHAR_HEX_CODE_MAX_LENGTH } from "./constants";
import { HardhatConfig, HardhatUserConfig, HttpNetworkConfig } from "hardhat/types";
import { getDefaultHttpNetworkConfig, traverseFiles, checkArtifactExists } from "./utils";
import { DockerWrapper, VenvWrapper } from "./starknet-wrappers";
import { starknetCompileAction, starknetDeployAction, starknetVoyagerAction } from "./task-actions"

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
        await starknetCompileAction(hre, args);
    });


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
    ).setAction(starknetDeployAction);



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
        },

        stringToBigInt: convertableString => {

            if(convertableString.length > SHORT_STRING_MAX_CHARACTERS) {
                const msg = `Strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            
            if(!/^[\x00-\x7F]*$/.test(convertableString)){
                const msg = "Input string contains an invalid ASCII character.";
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            
            const charArray = convertableString.split("").map(c => c.toString().charCodeAt(0).toString(16));
            return BigInt("0x" + charArray.join(""));
        },

        bigIntToString: convertableBigInt => {
           return Buffer.from(convertableBigInt.toString(16), 'hex').toString();
        }
}});

task("starknet-verify", "Verifies the contract in the Starknet network.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addParam("path", `The path of the cairo contract (e.g. contracts/conract.cairo)`)
    .addParam("address", `The address where the contract is deployed`)
    .setAction(starknetVoyagerAction);
