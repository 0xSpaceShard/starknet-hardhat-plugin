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
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}

declare module "mocha" {
    export interface MochaOptions {
        starknetNetwork?: string;
    }
}
