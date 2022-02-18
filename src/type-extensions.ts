import "hardhat/types/config";
import "hardhat/types/runtime";
import { StarknetContract, StarknetContractFactory, StringMap } from "./types";
import { StarknetWrapper } from "./starknet-wrappers";

type StarknetConfig = {
    dockerizedVersion?: string;
    venv?: string;
    wallets?: WalletUserConfig;
    network?: string;
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

declare module "hardhat/types/runtime" {
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
             * The selected starknet-network, present if the called task relies on `--starknet-network` or `starknet["network"]` in the config object.
             */
            network?: string;

            /**
             * @param name the name of the wallet to get
             * @returns a wallet
             */
            getWallet: (name: string) => WalletConfig;
        };
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
    type Wallet = WalletConfig;
}
