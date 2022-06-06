import "hardhat/types/config";
import "hardhat/types/runtime";
import {
    AccountImplementationType,
    BlockIdentifier,
    DeployAccountOptions,
    StarknetContract,
    StarknetContractFactory,
    StringMap
} from "./types";
import { StarknetWrapper } from "./starknet-wrappers";
import { FlushResponse, LoadL1MessagingContractResponse } from "./devnet-utils";
import { Account, ArgentAccount, OpenZeppelinAccount } from "./account";
import { Transaction, TransactionReceipt, Block } from "./starknet-types";
import { HardhatNetworkConfig, NetworkConfig } from "hardhat/types/config";
import { StarknetCompiler } from "./compiler";
import { StarknetUtils } from "./starknet-utils";

type StarknetConfig = {
    dockerizedVersion?: string;
    venv?: string;
    wallets?: WalletUserConfig;
    network?: string;
    networkUrl?: string;
    networkConfig?: NetworkConfig;
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
        alpha: HttpNetworkConfig;
        alphaMainnet: HttpNetworkConfig;
        integratedDevnet: HardhatNetworkConfig;
    }

    export interface NetworksUserConfig {
        integratedDevnet?: HardhatNetworkUserConfig;
    }

    export interface HttpNetworkConfig {
        verificationUrl?: string;
        verifiedUrl?: string;
        starknetChainId?: string;
    }

    export interface HardhatNetworkConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
        starknetChainId?: string;
    }

    export interface HardhatNetworkUserConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
    }
}

type StarknetContractType = StarknetContract;
type StarknetContractFactoryType = StarknetContractFactory;
type StringMapType = StringMap;
type AccountType = Account;
type OpenZeppelinAccountType = OpenZeppelinAccount;
type ArgentAccountType = ArgentAccount;
type TransactionReceiptType = TransactionReceipt;
type TransactionType = Transaction;
type BlockType = Block;

declare module "hardhat/types/runtime" {
    interface Devnet {
        /**
         * Restarts the devnet.
         * @returns void
         * @throws {@link HardhatPluginError}
         */
        restart(): Promise<void>;

        /**
         * Handles all pending L1 to L2 messages and sends them to the other layer
         * @returns {Promise} - Metadata for the flushed messages
         */
        flush: () => Promise<FlushResponse>;

        /**
         * Deploys or loads the L1 messaging contract.
         * @param {string} networkUrl - L1 network url.
         * @param {string} [address] - Address of the contract to be loaded.
         * @param {string} [networkId] - Determines if the ganache or tesnet should be used/
         * @returns
         */
        loadL1MessagingContract: (
            networkUrl: string,
            address?: string,
            networkId?: string
        ) => Promise<LoadL1MessagingContractResponse>;
    }

    interface HardhatRuntimeEnvironment {
        starknetCompiler: StarknetCompiler;

        starknetWrapper: StarknetWrapper;

        starknet: StarknetUtils;
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Wallet = WalletConfig;
    type Account = AccountType;
    type OpenZeppelinAccount = OpenZeppelinAccountType;
    type ArgentAccount = ArgentAccountType;
    type Transaction = TransactionType;
    type TransactionReceipt = TransactionReceiptType;
    type Block = BlockType;
}
