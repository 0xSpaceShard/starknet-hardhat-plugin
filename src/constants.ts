import config from "../config.json";

export const PLUGIN_NAME = "Starknet";
export const ABI_SUFFIX = "_abi.json";
export const DEFAULT_STARKNET_SOURCES_PATH = "contracts";
export const DEFAULT_STARKNET_ARTIFACTS_PATH = "starknet-artifacts";
export const DEFAULT_STARKNET_ACCOUNT_PATH = "~/.starknet_accounts";
export const CAIRO_CLI_DOCKER_REPOSITORY = "shardlabs/cairo-cli";
export const CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG = config["CAIRO_LANG"];
export const DEVNET_DOCKER_REPOSITORY = "shardlabs/starknet-devnet";
export const DEFAULT_DEVNET_DOCKER_IMAGE_TAG = config["STARKNET_DEVNET"];
export const INTEGRATED_DEVNET_URL = "http://127.0.0.1:5000";

export const CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG = `${CAIRO_CLI_DOCKER_REPOSITORY}:${CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG}`;

export const ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH = "account-contract-artifacts";
export const ACCOUNT_ARTIFACTS_VERSION = "0.2.0";
export const GITHUB_ACCOUNT_ARTIFACTS_URL = `https://raw.githubusercontent.com/Shard-Labs/starknet-hardhat-example/plugin/${ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH}/${ACCOUNT_ARTIFACTS_VERSION}/`;

export const ALPHA_TESTNET = "alpha-goerli";
export const ALPHA_TESTNET_INTERNALLY = "alpha";
export const ALPHA_MAINNET = "alpha-mainnet";
export const ALPHA_MAINNET_INTERNALLY = "alphaMainnet";
export const DEFAULT_STARKNET_NETWORK = ALPHA_TESTNET_INTERNALLY;
export const ALPHA_URL = "https://alpha4.starknet.io";
export const ALPHA_MAINNET_URL = "https://alpha-mainnet.starknet.io";
export const INTEGRATED_DEVNET = "integrated-devnet";
export const INTEGRATED_DEVNET_INTERNALLY = "integratedDevnet";
export const TESTNET_CHAIN_ID = "SN_GOERLI";
export const ALPHA_MAINNET_CHAIN_ID = "SN_MAIN";

export const CHECK_STATUS_TIMEOUT = 5000; // ms
export const CHECK_STATUS_RECOVER_TIMEOUT = 10000; // ms

export const LEN_SUFFIX = "_len";
export const VOYAGER_GOERLI_CONTRACT_API_URL = "https://goerli.voyager.online/api/contract/";
export const VOYAGER_MAINNET_CONTRACT_API_URL = "https://voyager.online/api/contract/";

export const SHORT_STRING_MAX_CHARACTERS = 31;

export const PENDING_BLOCK_NUMBER = "pending";

export const PREFIX_TRANSACTION = "StarkNet Transaction";
