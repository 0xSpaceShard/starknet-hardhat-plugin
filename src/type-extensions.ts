import { DockerWrapper, StarknetContract } from "./types";

type CairoConfig = {
    version: string;
}

declare module "hardhat/types/config" {
    export interface ProjectPathsUserConfig {
        starknetArtifacts?: string;
    }

    export interface ProjectPathsConfig {
        starknetArtifacts: string;
    }

    export interface HardhatConfig {
        cairo: CairoConfig;
    }

    export interface HardhatUserConfig {
        cairo: CairoConfig;
    }
}

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}
