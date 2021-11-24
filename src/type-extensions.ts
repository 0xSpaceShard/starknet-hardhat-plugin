import "hardhat/types/config";
import "hardhat/types/runtime";
import { DockerWrapper, StarknetContract, StarknetContractFactory, StringMap } from "./types";

type CairoConfig = {
    version: string;
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
    }
}

type StarknetContractType = StarknetContract;
type StarknetContractFactoryType = StarknetContractFactory;
type StringMapType = StringMap;

declare module "hardhat/types/runtime" {
    interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;

        starknet: {
            /**
             * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
             * the provided string should be `MyContract`.
             * @param name the case-sensitive contract name
             * @returns a factory for generating instances of the desired contract
             */
            getContractFactory: (name: string) => Promise<StarknetContractFactory>;

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
