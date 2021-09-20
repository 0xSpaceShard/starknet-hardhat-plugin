import { DockerWrapper, StarknetContract } from "./types";

declare module "hardhat/types/config" {
    export interface ProjectPathsUserConfig {
        starknetArtifacts?: string;
    }

    export interface ProjectPathsConfig {
        starknetArtifacts: string;
    }
}

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}
