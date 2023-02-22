import "hardhat/types/config";
import "hardhat/types/runtime";
import { StarknetContract, StarknetContractFactory, StringMap } from "./types";
import { StarknetWrapper } from "./starknet-wrappers";
import * as DevnetTypes from "./types/devnet";
import * as StarknetTypes from "./types/starknet";
import { Account } from "./account";
import { Transaction, TransactionReceipt, Block, TransactionTrace } from "./starknet-types";
import { StarknetChainId } from "./constants";
import { AmarnaDocker } from "./external-server/docker-amarna";

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
        starknet: StarknetTypes.StarknetConfig;
    }

    export interface HardhatUserConfig {
        starknet?: StarknetTypes.StarknetConfig;
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
        vmLang?: VmLang;
    }

    export interface HardhatNetworkConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
        starknetChainId?: StarknetChainId;
        args?: string[];
        stdout?: string;
        stderr?: string;
        vmLang?: VmLang;
    }

    export interface HardhatNetworkUserConfig {
        url?: string;
        venv?: string;
        dockerizedVersion?: string;
        args?: string[];
        stdout?: string;
        stderr?: string;
        vmLang?: VmLang;
    }

    type VmLang = "python" | "rust" | "";
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
        amarnaDocker: AmarnaDocker;
        starknet: StarknetTypes.Starknet;
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Wallet = StarknetTypes.WalletConfig;
    type Account = AccountType;
    type Transaction = TransactionType;
    type TransactionReceipt = TransactionReceiptType;
    type TransactionTrace = TransactionTraceType;
    type Block = BlockType;
}
