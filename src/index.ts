import * as path from "path";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { StarknetPluginError } from "./starknet-plugin-error";
import { lazyObject } from "hardhat/plugins";
import {
    ConfigurableTaskDefinition,
    HardhatConfig,
    HardhatNetworkConfig,
    HardhatRuntimeEnvironment,
    HardhatUserConfig
} from "hardhat/types";
import exitHook from "exit-hook";

import "./type-extensions";
import {
    DEFAULT_STARKNET_SOURCES_PATH,
    DEFAULT_STARKNET_ARTIFACTS_PATH,
    CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG,
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
    StarknetChainId
} from "./constants";
import {
    adaptPath,
    getAccountPath,
    getDefaultHardhatNetworkConfig,
    getDefaultHttpNetworkConfig,
    getImageTagByArch,
    getNetwork
} from "./utils";
import { DockerWrapper, VenvWrapper } from "./starknet-wrappers";
import {
    amarnaAction,
    starknetCompileAction,
    starknetVoyagerAction,
    starknetTestAction,
    starknetRunAction,
    starknetPluginVersionAction,
    starknetMigrateAction,
    starknetNewAccountAction,
    starknetDeployAccountAction
} from "./task-actions";
import {
    bigIntToShortStringUtil,
    getContractFactoryUtil,
    getTransactionUtil,
    getTransactionReceiptUtil,
    getWalletUtil,
    shortStringToBigIntUtil,
    getBlockUtil,
    getNonceUtil,
    getTransactionTraceUtil,
    getBalanceUtil
} from "./extend-utils";
import { DevnetUtils } from "./devnet-utils";
import { ExternalServer } from "./external-server";
import { ArgentAccount, OpenZeppelinAccount } from "./account";
import { AmarnaDocker } from "./external-server/docker-amarna";

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
    if (userConfig.starknet && userConfig.starknet.network) {
        config.starknet.network = userConfig.starknet.network;
    } else {
        config.starknet.network = DEFAULT_STARKNET_NETWORK;
    }
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

function extractAccountPaths(hre: HardhatRuntimeEnvironment): string[] {
    const accountPaths = new Set<string>();
    const wallets = hre.config.starknet.wallets || {};
    for (const walletName in wallets) {
        const wallet = wallets[walletName];
        if (wallet.accountPath) {
            const normalizedPath = getAccountPath(wallet.accountPath, hre);
            accountPaths.add(normalizedPath);
        }
    }
    return [...accountPaths];
}

// add venv wrapper or docker wrapper of starknet
extendEnvironment((hre) => {
    const venvPath = hre.config.starknet.venv;
    if (venvPath) {
        setVenvWrapper(hre, venvPath);
    } else {
        const repository = CAIRO_CLI_DOCKER_REPOSITORY;
        const tag = getImageTagByArch(
            hre.config.starknet.dockerizedVersion || CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG
        );

        const image = { repository, tag };
        const accountPaths = extractAccountPaths(hre);
        const cairoPaths = [];
        for (const cairoPath of hre.config.paths.cairoPaths || []) {
            cairoPaths.push(adaptPath(hre.config.paths.root, cairoPath));
        }

        hre.starknetWrapper = new DockerWrapper(
            image,
            hre.config.paths.root,
            accountPaths,
            cairoPaths,
            hre
        );

        const amarnaImage = { repository: AMARNA_DOCKER_REPOSITORY, tag: AMARNA_DOCKER_IMAGE_TAG };
        hre.amarnaDocker = new AmarnaDocker(
            amarnaImage,
            hre.config.paths.root,
            hre.config.paths.cairoPaths || [],
            hre
        );
    }
});

task("starknet-compile", "Compiles Starknet contracts")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths to be used for deployment.\n" +
            "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
            "If no paths are provided, the default contracts directory is traversed."
    )
    .addOptionalParam(
        "cairoPath",
        "Allows specifying the locations of imported files, if necessary.\n" +
            "Separate them with a colon (:), e.g. --cairo-path='path/to/lib1:path/to/lib2'"
    )
    .addFlag("accountContract", "Allows compiling an account contract.")
    .addFlag("disableHintValidation", "Allows compiling a contract with any python code in hints.")
    .setAction(starknetCompileAction);

extendEnvironment((hre) => {
    hre.starknet = {
        getContractFactory: async (contractPath) => {
            const contractFactory = await getContractFactoryUtil(hre, contractPath);
            return contractFactory;
        },

        shortStringToBigInt: (convertableString) => {
            const convertedString = shortStringToBigIntUtil(convertableString);
            return convertedString;
        },

        bigIntToShortString: (convertableBigInt) => {
            const convertedBigInt = bigIntToShortStringUtil(convertableBigInt);
            return convertedBigInt;
        },

        getWallet: (name) => {
            const wallet = getWalletUtil(name, hre);
            return wallet;
        },

        devnet: lazyObject(() => new DevnetUtils(hre)),

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

        network: hre.config.starknet.network,
        networkConfig: hre.config.starknet.networkConfig as HardhatNetworkConfig,

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
    .addOptionalParam("license", "The licence of the contract (e.g No License (None))")
    .addOptionalVariadicPositionalParam(
        "paths",
        "The paths of the dependencies of the contract specified in --path\n" +
            "All dependencies should be in the same folder as the contract." +
            "e.g. path/to/dependency1 path/to/dependency2"
    )
    .setAction(starknetVoyagerAction);

task("starknet-new-account", "Initializes a new account according to the parameters.")
    .addParam("wallet", "The wallet object to use, defined in the 'hardhat.config' file")
    .addParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .setAction(starknetNewAccountAction);

task("starknet-deploy-account", "Deploys a new account according to the parameters.")
    .addParam("wallet", "The wallet object to use, defined in the 'hardhat.config' file")
    .addParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .setAction(starknetDeployAccountAction);

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

task("migrate", "Migrates a cairo contract to syntax of cairo-lang v0.10.0.")
    .addOptionalVariadicPositionalParam("paths", "The name of the contract to migrate")
    .addFlag("inplace", "Applies changes to the files in place.")
    .setAction(starknetMigrateAction);

task("amarna", "Runs Amarna, the static-analyzer and linter for Cairo.")
    .addFlag("script", "Run ./amarna.sh file to use Amarna with custom args.")
    .setAction(amarnaAction);
