import { DockerWrapper, StarknetContract } from "./types";

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

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;
        /**
         * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
         * the string should be `MyContract`.
         * @param name the case-sensitive contract name
         */
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}

declare module "mocha" {
    export interface MochaOptions {
        starknetNetwork?: string;
    }
}
