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
             * Converts a short string (max 31 characters) to a BigInt. Only accepts characters whose hex value has exactly 2 characters. 
             * @param input the input short string
             * @returns a BigInt which is the result of converting a string's ASCII value to its hex equivalent
             */
            stringToBigInt: (convertableString: string) => BigInt;

            /**
             * Converts a BigInt to a string.
             * @param input the input BigInt
             * @returns a string which is the result of converting a BigInt's hex value to its ASCII equivalent
             */
            bigIntToString: (convertableBigInt: BigInt) => string;

            /**
             * The selected starknet-network, present when specified with --starknet-network.
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
