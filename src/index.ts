import * as path from "path";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import "./type-extensions";
import { PLUGIN_NAME, DEFAULT_STARKNET_SOURCES_PATH, DEFAULT_STARKNET_ARTIFACTS_PATH, DEFAULT_DOCKER_IMAGE_TAG, DOCKER_REPOSITORY, ALPHA_URL, ALPHA_MAINNET_URL, VOYAGER_GOERLI_CONTRACT_API_URL, VOYAGER_MAINNET_CONTRACT_API_URL } from "./constants";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import { getDefaultHttpNetworkConfig } from "./utils";
import { DockerWrapper, VenvWrapper } from "./starknet-wrappers";
import { starknetCompileAction, starknetDeployAction, starknetVoyagerAction, starknetInvokeAction, starknetCallAction, starknetDeployAccountAction } from "./task-actions";
import { bigIntToStringUtil, getContractFactoryUtil, getWalletUtil, stringToBigIntUtil } from "./extend-utils";

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
        config.networks.alpha = getDefaultHttpNetworkConfig(ALPHA_URL, VOYAGER_GOERLI_CONTRACT_API_URL);
    }

    if (!config.networks.alphaMainnet) {
        config.networks.alphaMainnet = getDefaultHttpNetworkConfig(ALPHA_MAINNET_URL, VOYAGER_MAINNET_CONTRACT_API_URL);
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
    .setAction(starknetCompileAction);


task("starknet-deploy", "Deploys Starknet contracts which have been compiled.")
    .addFlag("wait", "Wait for deployment transaction to be at least ACCEPTED_ON_L2")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", `The URL of the gateway to be used (e.g. ${ALPHA_URL})`)
    .addOptionalParam("inputs",
        "Space separated values forming constructor input.\n" +
        "Pass them as a single string; e.g. --inputs \"1 2 3\"\n" +
        "You would typically use this feature when deploying a single contract.\n" +
        "If you're deploying multiple contracts, they'll all use the same input."
    )
    .addOptionalParam("salt",
        "An optional salt controlling where the contract will be deployed.\n" +
        "The contract deployment address is determined by the hash of contract, salt and caller.\n" +
        "If the salt is not supplied, the contract will be deployed with a random salt."
    )
    .addOptionalVariadicPositionalParam("paths",
        "The paths to be used for deployment.\n" +
        "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
        "If no paths are provided, the default artifacts directory is traversed."
    ).setAction(starknetDeployAction);


extendEnvironment(hre => {
    hre.starknet = {
        getContractFactory: async contractPath => {
            const contractFactory = await getContractFactoryUtil(hre, contractPath);
            return contractFactory;
        },

        stringToBigInt: convertableString => {
            const convertedString = stringToBigIntUtil(convertableString);
            return convertedString;
        },

        bigIntToString: convertableBigInt => {
            const convertedBigInt = bigIntToStringUtil(convertableBigInt);
            return convertedBigInt;
        },

        getWallet: name => {
            const wallet = getWalletUtil(name, hre);
            return wallet;
        }
    };
});

task("starknet-verify", "Verifies the contract in the Starknet network.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addParam("path", "The path of the cairo contract (e.g. contracts/conract.cairo)")
    .addParam("address", "The address where the contract is deployed")
    .setAction(starknetVoyagerAction);

task("starknet-invoke", "Invokes a function on a contract in the provided address.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", `The URL of the gateway to be used (e.g. ${ALPHA_URL})`)
    .addParam("contract", "The name of the contract to invoke from")
    .addParam("function", "The name of the function to invoke")
    .addParam("address", "The address where the contract is deployed")
    .addOptionalParam("inputs",
        "Space separated values forming function input.\n" +
        "Pass them as a single string; e.g. --inputs \"1 2 3\"")
    .addOptionalParam("signature", "The call signature")
    .addOptionalParam("wallet", "The wallet to use, defined in the 'hardhat.config' file. If omitted, the '--no_wallet' flag will be passed when invoking.")
    .setAction(starknetInvokeAction);

task("starknet-call", "Invokes a function on a contract in the provided address.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", `The URL of the gateway to be used (e.g. ${ALPHA_URL})`)
    .addParam("contract", "The name of the contract to invoke from")
    .addParam("function", "The name of the function to invoke")
    .addParam("address", "The address where the contract is deployed")
    .addOptionalParam("inputs",
        "Space separated values forming function input.\n" +
        "Pass them as a single string; e.g. --inputs \"1 2 3\"")
    .addOptionalParam("signature", "The call signature")
    .addOptionalParam("wallet", "The wallet to use, defined in the 'hardhat.config' file. If omitted, the '--no_wallet' flag will be passed when calling.")
    .addOptionalParam("blockNumber", "The number of the block to call")
    .setAction(starknetCallAction);

task("starknet-deploy-account", "Deploys a new account according to the parameters.")
    .addParam("wallet", "The wallet object to use, defined in the 'hardhat.config' file")
    .addParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .setAction(starknetDeployAccountAction);
