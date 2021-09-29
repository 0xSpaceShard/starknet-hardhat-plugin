import { DockerWrapper, StarknetContract } from "./types";

type CairoConfig = {
    version: string;
}

type StarknetConfig = {
    testGatewayUrl: string;
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
        starknet: StarknetConfig;
    }

    export interface HardhatUserConfig {
        cairo?: CairoConfig;
        starknet?: StarknetConfig;
    }
}

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}
