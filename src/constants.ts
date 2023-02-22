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
export const DEFAULT_DEVNET_CAIRO_VM = "python";
export const AMARNA_DOCKER_REPOSITORY = "shramee/amarna";
export const AMARNA_DOCKER_IMAGE_TAG = "latest";
export const INTEGRATED_DEVNET_URL = "http://127.0.0.1:5050";

export const CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG = `${CAIRO_CLI_DOCKER_REPOSITORY}:${CAIRO_CLI_DEFAULT_DOCKER_IMAGE_TAG}`;

export const INTERNAL_ARTIFACTS_DIR = "contract-artifacts";

export const ALPHA_TESTNET = "alpha-goerli";
export const ALPHA_TESTNET_2 = "alpha-goerli2";
export const ALPHA_TESTNET_INTERNALLY = "alphaGoerli";
export const ALPHA_TESTNET_2_INTERNALLY = "alphaGoerli2";
export const ALPHA_MAINNET = "alpha-mainnet";
export const ALPHA_MAINNET_INTERNALLY = "alphaMainnet";
export const DEFAULT_STARKNET_NETWORK = ALPHA_TESTNET_INTERNALLY;
export const ALPHA_URL = "https://alpha4.starknet.io";
export const ALPHA_GOERLI_URL_2 = "https://alpha4-2.starknet.io";
export const ALPHA_MAINNET_URL = "https://alpha-mainnet.starknet.io";
export const INTEGRATED_DEVNET = "integrated-devnet";
export const INTEGRATED_DEVNET_INTERNALLY = "integratedDevnet";

export const VOYAGER_GOERLI_CONTRACT_API_URL = "https://goerli.voyager.online/api/contract/";
export const VOYAGER_GOERLI_VERIFIED_URL = "https://goerli.voyager.online/contract/";
export const VOYAGER_GOERLI_2_CONTRACT_API_URL = "https://goerli-2.voyager.online/api/contract";
export const VOYAGER_GOERLI_2_VERIFIED_URL = "https://goerli-2.voyager.online/contract/";
export const VOYAGER_MAINNET_CONTRACT_API_URL = "https://voyager.online/api/contract/";
export const VOYAGER_MAINNET_VERIFIED_URL = "https://voyager.online/contract/";

export const CHECK_STATUS_TIMEOUT = 5000; // ms
export const CHECK_STATUS_RECOVER_TIMEOUT = 10000; // ms

export const LEN_SUFFIX = "_len";

export const SHORT_STRING_MAX_CHARACTERS = 31;

export enum TransactionHashPrefix {
    DECLARE = "28258975365558885", // BigInt("0x" + Buffer.from("declare").toString("hex")).toString()
    DEPLOY = "110386840629113",
    DEPLOY_ACCOUNT = "2036277798190617858034555652763252",
    INVOKE = "115923154332517"
}

export enum StarknetChainId {
    MAINNET = "0x534e5f4d41494e",
    TESTNET = "0x534e5f474f45524c49",
    TESTNET2 = "0x534e5f474f45524c4932"
}

export const PREFIX_TRANSACTION = "Starknet Transaction";

export const TRANSACTION_VERSION = BigInt(1);
export const QUERY_VERSION = BigInt(2) ** BigInt(128) + TRANSACTION_VERSION;

export const HEXADECIMAL_REGEX = /^0x[0-9a-fA-F]+?$/;

export const UDC_ADDRESS = "0x41A78E741E5AF2FEC34B695679BC6891742439F7AFB8484ECD7766661AD02BF";
export const UDC_DEPLOY_FUNCTION_NAME = "deployContract";

export const ETH_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
