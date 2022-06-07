import "hardhat/types/config";
import "hardhat/types/runtime";

import { NetworkConfig } from "hardhat/types/config";
import { StarknetCompiler } from "./compiler";
import { StarknetUtils } from "./starknet-utils";
import { FlushResponse, LoadL1MessagingContractResponse } from "./starknet-utils/devnet-utils";

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

        starknet: StarknetUtils;
    }
}
