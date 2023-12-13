import exitHook from "exit-hook";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import {
    ConfigurableTaskDefinition,
    HardhatConfig,
    HardhatNetworkConfig,
    HardhatRuntimeEnvironment,
    HardhatUserConfig
} from "hardhat/types";
import * as path from "node:path";
import * as starknet from "starknet";

import {
    DEFAULT_STARKNET_SOURCES_PATH,
    DEFAULT_STARKNET_ARTIFACTS_PATH,
    CAIRO_CLI_DOCKER_REPOSITORY,
    AMARNA_DOCKER_REPOSITORY,
    AMARNA_DOCKER_IMAGE_TAG,
    ALPHA_URL,
    ALPHA_GOERLI_URL_2,
    ALPHA_MAINNET_URL,
    VOYAGER_GOERLI_CONTRACT_API_URL,
    VOYAGER_MAINNET_CONTRACT_API_URL,
    DEFAULT_STARKNET_NETWORK,
    INTEGRATED_DEVNET_URL,
    VOYAGER_GOERLI_VERIFIED_URL,
    VOYAGER_MAINNET_VERIFIED_URL,
    VOYAGER_GOERLI_2_CONTRACT_API_URL,
    VOYAGER_GOERLI_2_VERIFIED_URL,
    StarknetChainId,
    SUPPORTED_SCARB_VERSION
} from "./constants";
import {
    adaptPath,
    getCairoCliImageTagByArch,
    getDefaultHardhatNetworkConfig,
    getDefaultHttpNetworkConfig,
    getNetwork
} from "./utils";

import { StarknetPluginError } from "./starknet-plugin-error";
import { DockerWrapper, VenvWrapper } from "./starknet-wrappers";
import {
    amarnaAction,
    starknetDeprecatedCompileAction,
    starknetVoyagerAction,
    starknetTestAction,
    starknetRunAction,
    starknetPluginVersionAction,
    starknetCompileCairo1Action,
    starknetBuildAction
} from "./task-actions";
import {
    bigIntToShortStringUtil,
    getContractFactoryUtil,
    getTransactionUtil,
    getTransactionReceiptUtil,
    shortStringToBigIntUtil,
    getBlockUtil,
    getNonceUtil,
    getTransactionTraceUtil,
    getBalanceUtil
} from "./legacy/extend-utils";
import { DevnetUtils } from "./utils/devnet-utils";
import { ExternalServer } from "./external-server";
import { OpenZeppelinAccount } from "./legacy/account/open-zeppelin-account";
import { ArgentAccount } from "./legacy/account/argent-account";
import { AmarnaDocker } from "./external-server/docker-amarna";
import { StarknetJsWrapper } from "./starknet-js-wrapper";
import "./type-extensions";

exitHook(() => {
    ExternalServer.cleanAll();
});

// copy all user-defined cairo settings; other extendConfig calls will overwrite if needed
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    if (userConfig.starknet) {
        config.starknet = JSON.parse(JSON.stringify(userConfig.starknet));
    }
    if (!config.starknet) {
        config.starknet = {};
    }
    if (!config.starknet.requestTimeout) {
        config.starknet.requestTimeout = 30_000;
    }
});

// add sources path
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetSources) {
        const userPath = userConfig.paths.starknetSources;
        newPath = adaptPath(config.paths.root, userPath);
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
        newPath = adaptPath(config.paths.root, userPath);
        config.paths.starknetArtifacts = userConfig.paths.starknetArtifacts;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_ARTIFACTS_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetArtifacts = newPath;
});

// add url to alpha network
extendConfig((config: HardhatConfig) => {
    if (!config.networks.alphaGoerli) {
        config.networks.alphaGoerli = getDefaultHttpNetworkConfig(
            ALPHA_URL,
            VOYAGER_GOERLI_CONTRACT_API_URL,
            VOYAGER_GOERLI_VERIFIED_URL,
            StarknetChainId.TESTNET
        );
    }

    if (!config.networks.alphaGoerli2) {
        config.networks.alphaGoerli2 = getDefaultHttpNetworkConfig(
            ALPHA_GOERLI_URL_2,
            VOYAGER_GOERLI_2_CONTRACT_API_URL,
            VOYAGER_GOERLI_2_VERIFIED_URL,
            StarknetChainId.TESTNET2
        );
    }

    if (!config.networks.alphaMainnet) {
        config.networks.alphaMainnet = getDefaultHttpNetworkConfig(
            ALPHA_MAINNET_URL,
            VOYAGER_MAINNET_CONTRACT_API_URL,
            VOYAGER_MAINNET_VERIFIED_URL,
            StarknetChainId.MAINNET
        );
    }

    if (!config.networks.integratedDevnet) {
        config.networks.integratedDevnet = getDefaultHardhatNetworkConfig(INTEGRATED_DEVNET_URL);
    }
});

// set network as specified in userConfig
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.starknet.network = userConfig.starknet?.network || DEFAULT_STARKNET_NETWORK;

    const networkConfig = getNetwork(
        config.starknet.network,
        config.networks,
        "starknet.network in hardhat.config"
    );
    config.starknet.networkConfig = networkConfig;
});

function setVenvWrapper(hre: HardhatRuntimeEnvironment, venvPath: string) {
    if (hre.config.starknet.dockerizedVersion) {
        const msg =
            "Error in config file. Only one of (starknet.dockerizedVersion, starknet.venv) can be specified.";
        throw new StarknetPluginError(msg);
    }
    hre.starknetWrapper = new VenvWrapper(venvPath, hre);
}

// add venv wrapper or docker wrapper of starknet
extendEnvironment((hre) => {
    hre.starknetJs = new StarknetJsWrapper(hre);

    const venvPath = hre.config.starknet.venv;
    if (venvPath) {
        setVenvWrapper(hre, venvPath);
    } else {
        const repository = CAIRO_CLI_DOCKER_REPOSITORY;
        const tag = getCairoCliImageTagByArch(hre.config.starknet.dockerizedVersion);

        const image = { repository, tag };
        const cairoPaths = [];
        for (const cairoPath of hre.config.paths.cairoPaths || []) {
            cairoPaths.push(adaptPath(hre.config.paths.root, cairoPath));
        }

        hre.starknetWrapper = new DockerWrapper(image, hre.config.paths.root, cairoPaths, hre);

        const amarnaImage = { repository: AMARNA_DOCKER_REPOSITORY, tag: AMARNA_DOCKER_IMAGE_TAG };
        hre.amarnaDocker = new AmarnaDocker(
            amarnaImage,
            hre.config.paths.root,
            hre.config.paths.cairoPaths || [],
            hre
        );
    }
});

task("starknet-compile-deprecated", "Compiles Starknet (Cairo 0) contracts")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths to be used for compilation.\n" +
            "Each of the provided paths is recursively looked into while searching for source files.\n" +
            "If no paths are provided, the default contracts directory is traversed."
    )
    .addOptionalParam(
        "cairoPath",
        "Allows specifying the locations of imported files, if necessary.\n" +
            "Separate them with a colon (:), e.g. --cairo-path='path/to/lib1:path/to/lib2'"
    )
    .addFlag("accountContract", "Allows compiling an account contract.")
    .addFlag("disableHintValidation", "Allows compiling a contract with any python code in hints.")
    .setAction(starknetDeprecatedCompileAction);

task("starknet-compile", "Compiles Starknet (Cairo 1) contracts")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths are source files of contracts to be compiled.\n" +
            "Each of the provided paths is recursively looked into while searching for source files.\n" +
            "If no paths are provided, the default contracts directory is traversed.\n" +
            "To build more complex Cairo 1 projects, read about `hardhat starknet-build`"
    )
    .addOptionalParam(
        "cairo1BinDir",
        "Allows specifying your local cairo compiler target directory; also configurable via `cairo1BinDir` in hardhat.config.ts file.\n" +
            "e.g. --cairo1-bin-dir 'path/to/cairo/target/release'"
    )
    .addFlag("replaceIds", "Replaces sierra ids with human-readable ones.")
    .addOptionalParam(
        "allowedLibfuncsListName",
        "The allowed libfuncs list to use (default: most recent audited list)."
    )
    .addOptionalParam("allowedLibfuncsListFile", "A file of the allowed libfuncs list to use.")
    .addFlag("addPythonicHints", "Add pythonic hints.")
    .addFlag("singleFile", "Compile single file.")
    .setAction(starknetCompileCairo1Action);

task("starknet-build", "Builds Scarb projects")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths are source files of contracts to be compiled.\n" +
            "Each of the provided paths is recursively looked into while searching for Scarb projects.\n" +
            "If no paths are provided, the default contracts directory is traversed.\n" +
            `Each project must be a valid Scarb ${SUPPORTED_SCARB_VERSION} project with lib.cairo and Scarb.toml in its root.\n` +
            "The toml file must have `sierra` and `casm` set to `true` under [[target.starknet-contract]].\n" +
            "In code, load the generated contracts with an underscore-separated string:\n" +
            "\tstarknet.getContractFactory('<PACKAGE_NAME>_<CONTRACT_NAME>')\n" +
            "E.g. if your toml specifies `name = MyPackage` and there is a contract called FooContract in your source files, you would load it with:\n" +
            "\tstarknet.getContractFactory('MyPackage_FooContract')\n" +
            "The name of the file where the contract was defined doesn't play a role.\n" +
            "The plugin doesn't have a default Scarb command yet (a dockerized wrapper will be supported soon).\n" +
            "You need to provide a `scarbCommand` (either an exact command or the path to it) under `starknet` in your hardhat config file, " +
            "or you can override that via `--scarb-command <COMMAND>`."
    )
    .addOptionalParam(
        "scarbCommand",
        "Your local Scarb command or path to the executable file. Overrides the one set in the hardhat config file"
    )
    .addFlag(
        "skipValidate",
        "By default, your TOML config file will be validated to ensure it generates the artifacts required for later contract loading.\n" +
            "Set this flag to skip the validation."
    )
    .setAction(starknetBuildAction);

extendEnvironment((hre) => {
    hre.starknet = {
        ...starknet,
        devnet: lazyObject(() => new DevnetUtils(hre)),
        network: hre.config.starknet.network,
        networkConfig: hre.config.starknet.networkConfig as HardhatNetworkConfig
    };

    hre.starknetLegacy = {
        getContractFactory: async (contractPath) => {
            const contractFactory = await getContractFactoryUtil(hre, contractPath);
            return contractFactory;
        },

        shortStringToBigInt: (convertibleString) => {
            const convertedString = shortStringToBigIntUtil(convertibleString);
            return convertedString;
        },

        bigIntToShortString: (convertibleBigInt) => {
            const convertedBigInt = bigIntToShortStringUtil(convertibleBigInt);
            return convertedBigInt;
        },

        getTransaction: async (txHash) => {
            const transaction = await getTransactionUtil(txHash, hre);
            return transaction;
        },

        getTransactionReceipt: async (txHash) => {
            const txReceipt = await getTransactionReceiptUtil(txHash, hre);
            return txReceipt;
        },

        getTransactionTrace: async (txHash) => {
            const txTrace = await getTransactionTraceUtil(txHash, hre);
            return txTrace;
        },

        getBlock: async (identifier) => {
            const block = await getBlockUtil(hre, identifier);
            return block;
        },

        getNonce: async (address, options) => {
            const nonce = await getNonceUtil(hre, address, options);
            return nonce;
        },

        getBalance: async (address) => {
            const balance = await getBalanceUtil(address, hre);
            return balance;
        },

        OpenZeppelinAccount: OpenZeppelinAccount,
        ArgentAccount: ArgentAccount
    };
});

task("starknet-verify", "Verifies a contract on a Starknet network.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addParam("path", "The path of the main cairo contract (e.g. contracts/contract.cairo)")
    .addParam("address", "The address where the contract is deployed")
    .addParam("compilerVersion", "The compiler version used to compile the cairo contract")
    .addFlag("accountContract", "The contract type which specifies it's an account contract.")
    .addOptionalParam("license", "The license of the contract (e.g No License (None))")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths of the dependencies of the contract specified in --path\n" +
            "All dependencies should be in the same folder as the contract." +
            "e.g. path/to/dependency1 path/to/dependency2"
    )
    .setAction(starknetVoyagerAction);

function addStarknetNetworkParam(task: ConfigurableTaskDefinition): ConfigurableTaskDefinition {
    return task.addOptionalParam(
        "starknetNetwork",
        "Specify the starknet-network to be used; overrides the value from hardhat.config"
    );
}

addStarknetNetworkParam(task("test")).setAction(starknetTestAction);

addStarknetNetworkParam(task("run")).setAction(starknetRunAction);

task("starknet-plugin-version", "Prints the version of the starknet plugin.").setAction(
    starknetPluginVersionAction
);

task("amarna", "Runs Amarna, the static-analyzer and linter for Cairo.")
    .addFlag("script", "Run ./amarna.sh file to use Amarna with custom args.")
    .setAction(amarnaAction);

export * from "./types";
export * from "./types/starknet-types";
export * from "./starknet-plugin-error";
