import "hardhat/types/config";
import "hardhat/types/runtime";
import {
    AccountImplementationType,
    StarknetContract,
    StarknetContractFactory,
    StringMap
} from "./types";
import { StarknetWrapper } from "./starknet-wrappers";
import { FlushResponse, LoadL1MessagingContractResponse } from "./devnet-utils";
import { Account } from "./account";

type StarknetConfig = {
    dockerizedVersion?: string;
    venv?: string;
    wallets?: WalletUserConfig;
    network?: string;
    networkUrl?: string;
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
    }

    export interface HttpNetworkConfig {
        verificationUrl?: string;
    }
}

type StarknetContractType = StarknetContract;
type StarknetContractFactoryType = StarknetContractFactory;
type StringMapType = StringMap;
type AccountType = Account;

declare module "hardhat/types/runtime" {
    interface Devnet {
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
        starknetWrapper: StarknetWrapper;

        starknet: {
            /**
             * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
             * the provided string should be `MyContract`.
             * @param name the case-sensitive contract name
             * @param networkURL the network name
             * @returns a factory for generating instances of the desired contract
             */
            getContractFactory: (
                name: string,
                networkURL?: string
            ) => Promise<StarknetContractFactory>;

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
            network?: string;

            /**
             * The selected starknet-network url.
             * Present if the called task relies on `--starknet-network` or `starknet["network"]` in the config object.
             */
            networkUrl?: string;

            /**
             * @param name the name of the wallet to get
             * @returns a wallet
             */
            getWallet: (name: string) => WalletConfig;

            devnet: Devnet;

            /**
             * Deploys an Account contract based on the ABI and the type of Account selected
             * @param accountContract the case-sensitive contract name, same as {@link getContractFactory}
             * @param accountType the enumerator value of the type of Account to use
             * @returns an Account object
             */
            deployAccount: (accountType: AccountImplementationType) => Promise<AccountType>;

            /**
             * Returns an Account already deployed based on the address and validated by the private key
             * @param accountContract the case-sensitive contract name, same as {@link getContractFactory}
             * @param address the address where the account is deployed
             * @param privateKey the private key of the account
             * @param accountType the enumerator value of the type of Account to use
             * @returns an Account object
             */
            getAccountFromAddress: (
                address: string,
                privateKey: string,
                accountType: AccountImplementationType
            ) => Promise<AccountType>;
        };
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Wallet = WalletConfig;
    type Account = AccountType;
}
