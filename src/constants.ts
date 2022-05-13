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
export const INTEGRATED_DEVNET_URL = "http://127.0.0.1:5050";

export const CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG = `${CAIRO_CLI_DOCKER_REPOSITORY}:${CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG}`;

export const ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH = "account-contract-artifacts";
export const GITHUB_ACCOUNT_ARTIFACTS_URL =
    "https://raw.githubusercontent.com/" +
    "Shard-Labs/" +
    "starknet-hardhat-plugin/" +
    "account-artifacts/" +
    ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH;

export const ALPHA_TESTNET = "alpha-goerli";
export const ALPHA_TESTNET_INTERNALLY = "alpha";
export const ALPHA_MAINNET = "alpha-mainnet";
export const ALPHA_MAINNET_INTERNALLY = "alphaMainnet";
export const DEFAULT_STARKNET_NETWORK = ALPHA_TESTNET_INTERNALLY;
export const ALPHA_URL = "https://alpha4.starknet.io";
export const ALPHA_MAINNET_URL = "https://alpha-mainnet.starknet.io";
export const INTEGRATED_DEVNET = "integrated-devnet";
export const INTEGRATED_DEVNET_INTERNALLY = "integratedDevnet";

export enum ChainID {
    TESTNET = "SN_GOERLI",
    MAINNET = "SN_MAIN"
}

export const VOYAGER_GOERLI_CONTRACT_API_URL = "https://goerli.voyager.online/api/contract/";
export const VOYAGER_GOERLI_VERIFIED_URL = "https://goerli.voyager.online/contract/";
export const VOYAGER_MAINNET_CONTRACT_API_URL = "https://voyager.online/api/contract/";
export const VOYAGER_MAINNET_VERIFIED_URL = "https://voyager.online/contract/";

export const CHECK_STATUS_TIMEOUT = 5000; // ms
export const CHECK_STATUS_RECOVER_TIMEOUT = 10000; // ms

export const LEN_SUFFIX = "_len";

export const SHORT_STRING_MAX_CHARACTERS = 31;

export const PENDING_BLOCK_NUMBER = "pending";

export enum TransactionHashPrefix {
    DEPLOY = "110386840629113", // BigInt("0x" + Buffer.from("deploy").toString("hex")).toString()
    INVOKE = "115923154332517" // BigInt("0x" + Buffer.from("invoke").toString("hex")).toString()
}
