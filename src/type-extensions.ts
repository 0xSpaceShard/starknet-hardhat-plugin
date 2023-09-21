import "hardhat/types/config";
import "hardhat/types/runtime";
import type * as starknet from "starknet";

import { StarknetChainId } from "./constants";
import { AmarnaDocker } from "./external-server/docker-amarna";
import { Account, StarknetContractFactory, StarknetContract } from "./legacy";
import { Transaction, TransactionReceipt, TransactionTrace } from "./types/starknet-types";
import { StarknetJsWrapper } from "./starknet-js-wrapper";
import { StarknetWrapper } from "./starknet-wrappers";
import { StringMap } from "./types";
import * as DevnetTypes from "./types/devnet";
import * as StarknetEnvironment from "./types/starknet-environment";

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
        starknet: StarknetEnvironment.StarknetConfig;
    }

    export interface HardhatUserConfig {
        starknet?: StarknetEnvironment.StarknetConfig;
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
type BlockType = starknet.GetBlockResponse;

declare module "hardhat/types/runtime" {
    export interface Devnet extends DevnetTypes.Devnet {}
    interface HardhatRuntimeEnvironment {
        starknetWrapper: StarknetWrapper;
        amarnaDocker: AmarnaDocker;

        starknet: typeof starknet & StarknetEnvironment.Starknet;
        /** @deprecated 
         * The legacy utilities are meant to simplify the migration towards directly using `starknet.js` and will be removed in the future.
         * 
         * If there is a functionality that you find difficult to replace, let us know in the corresponding Discord channels: 
         * - hardhat-plugin https://discord.com/channels/793094838509764618/912735106899275856
         * - starknet.js https://discord.com/channels/793094838509764618/927918707613786162
         */
        starknetLegacy: StarknetEnvironment.StarknetLegacy;

        starknetJs: StarknetJsWrapper;
        starknetProvider: starknet.ProviderInterface;
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Account = AccountType;
    type Transaction = TransactionType;
    type TransactionReceipt = TransactionReceiptType;
    type TransactionTrace = TransactionTraceType;
    type Block = BlockType;
}
