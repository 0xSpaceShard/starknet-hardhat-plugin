import "hardhat/types/config";
import "hardhat/types/runtime";
import {
    BlockIdentifier,
    NonceQueryOptions,
    StarknetContract,
    StarknetContractFactory,
    StringMap
} from "./types";
import { StarknetWrapper } from "./starknet-wrappers";
import * as DevnetTypes from "./types/devnet";
import { Account, ArgentAccount, OpenZeppelinAccount } from "./account";
import { Transaction, TransactionReceipt, Block, TransactionTrace } from "./starknet-types";
import { HardhatNetworkConfig, NetworkConfig } from "hardhat/types/config";
import { StarknetChainId } from "./constants";

type StarknetConfig = {
    dockerizedVersion?: string;
    venv?: string;
    wallets?: WalletUserConfig;
    network?: string;
    networkUrl?: string;
    networkConfig?: NetworkConfig;
    recompile?: boolean;
};

type WalletUserConfig = {
    [walletName: string]: WalletConfig | undefined;
};

type WalletConfig = {
    modulePath: string;
    accountName?: string;
    accountPath?: string;
};

declare module "hardhat/types/config" {
    export interface ProjectPathsUserConfig {
        starknetArtifacts?: string;
        starknetSources?: string;
        cairoPaths?: string[];
    }

    export interface ProjectPathsConfig {
        starknetArtifacts: string;
        starknetSources?: string;
        cairoPaths?: string[];
    }

    export interface HardhatConfig {
        starknet: StarknetConfig;
    }

    export interface HardhatUserConfig {
        starknet?: StarknetConfig;
    }

    export interface NetworksConfig {
        alphaGoerli: HttpNetworkConfig;
        alphaGoerli2: HttpNetworkConfig;
        alphaMainnet: HttpNetworkConfig;
        integratedDevnet: HardhatNetworkConfig;
    }

    export interface NetworksUserConfig {
        integratedDevnet?: HardhatNetworkUserConfig;
    }

    export interface HttpNetworkConfig {
        verificationUrl?: string;
        verifiedUrl?: string;
        starknetChainId?: StarknetChainId;
    }

    export interface HardhatNetworkConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
        starknetChainId?: StarknetChainId;
        args?: string[];
        stdout?: string;
        stderr?: string;
    }

    export interface HardhatNetworkUserConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
        args?: string[];
        stdout?: string;
        stderr?: string;
    }
}

type StarknetContractType = StarknetContract;
type StarknetContractFactoryType = StarknetContractFactory;
type StringMapType = StringMap;
type AccountType = Account;
type TransactionReceiptType = TransactionReceipt;
type TransactionTraceType = TransactionTrace;
type TransactionType = Transaction;
type BlockType = Block;

declare module "hardhat/types/runtime" {
    export interface Devnet extends DevnetTypes.Devnet {}
    interface HardhatRuntimeEnvironment {
        starknetWrapper: StarknetWrapper;

        starknet: {
            /**
             * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
             * the provided string should be `MyContract`.
             * @param name the case-sensitive contract name
             * @returns a factory for generating instances of the desired contract
             */
            getContractFactory: (name: string) => Promise<StarknetContractFactory>;

            /**
             * Cairo and Starknet source files may contain short string literals,
             * which are interpreted as numbers (felts) during Starknet runtime.
             * Use this utility function to provide short string arguments to your contract functions.
             *
             * This function converts such a short string (max 31 characters) to its felt representation (wrapped in a `BigInt`).
             * Only accepts standard ASCII characters, i.e. characters with charcode between 0 and 127, inclusive.
             * @param input the input short string
             * @returns the numeric equivalent of the input short string, wrapped in a `BigInt`
             */
            shortStringToBigInt: (convertableString: string) => BigInt;

            /**
             * Converts a BigInt to a string. The opposite of {@link shortStringToBigInt}.
             * @param input the input BigInt
             * @returns a string which is the result of converting a BigInt's hex value to its ASCII equivalent
             */
            bigIntToShortString: (convertableBigInt: BigInt) => string;

            /**
             * The selected starknet-network name.
             * Present if the called task relies on `--starknet-network` or `starknet["network"]` in the config object.
             */
            network: string;

            /**
             * The configuration object of the selected starknet-network.
             */
            networkConfig: HardhatNetworkConfig;

            /**
             * @param name the name of the wallet to get
             * @returns a wallet
             */
            getWallet: (name: string) => WalletConfig;

            devnet: Devnet;

            getTransaction: (txHash: string) => Promise<Transaction>;

            getTransactionReceipt: (txHash: string) => Promise<TransactionReceipt>;

            /**
             * Returns execution information in a nested structure of calls.
             * @param txHash the transaction hash
             * @returns the transaction trace
             */
            getTransactionTrace: (txHash: string) => Promise<TransactionTrace>;

            /**
             * Returns an entire block and the transactions contained within it.
             * @param identifier optional block identifier (by block number or hash). To query the latest block, remove the identifier.
             * @returns a block object
             */
            getBlock: (identifier?: BlockIdentifier) => Promise<Block>;

            /**
             * Returns the nonce of the contract whose `address` is specified.
             * @param address the contract address
             * @param options optional arguments to specify the target
             * @returns the nonce
             */
            getNonce: (address: string, options?: NonceQueryOptions) => Promise<number>;

            OpenZeppelinAccount: typeof OpenZeppelinAccount;

            ArgentAccount: typeof ArgentAccount;
        };
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Wallet = WalletConfig;
    type Account = AccountType;
    type Transaction = TransactionType;
    type TransactionReceipt = TransactionReceiptType;
    type TransactionTrace = TransactionTraceType;
    type Block = BlockType;
}
