import "hardhat/types/config";
import "hardhat/types/runtime";
import { StarknetContract, StarknetContractFactory, StringMap } from "./types";
import { StarknetWrapper } from "./starknet-wrappers";

type CairoConfig = {
    version?: string;
    venv?: string;
}

declare module "hardhat/types/config" {
    export interface ProjectPathsUserConfig {
        starknetArtifacts?: string;
        starknetSources?: string;
    }

    export interface ProjectPathsConfig {
        starknetArtifacts: string;
        starknetSources?: string;
    }

    export interface HardhatConfig {
        cairo: CairoConfig;
    }

    export interface HardhatUserConfig {
        cairo?: CairoConfig;
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
            stringToBigInt: (convertableString: string) => BigInt;

            /**
             * Converts a BigInt to a string. The opposite of {@link stringToBigInt}.
             * @param input the input BigInt
             * @returns a string which is the result of converting a BigInt's hex value to its ASCII equivalent
             */
            bigIntToString: (convertableBigInt: BigInt) => string;

            /**
             * The selected starknet-network, present if the called task relies on `--starknet-network` or `mocha.starknetNetwork`.
             */
            network?: string;
        }
    }

    type StarknetContract = StarknetContractType;
    type StarknetContractFactory = StarknetContractFactoryType;
    type StringMap = StringMapType;
}

declare module "mocha" {
    export interface MochaOptions {
        starknetNetwork?: string;
    }
}
