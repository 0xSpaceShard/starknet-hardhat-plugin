import { DockerWrapper, StarknetContract } from "./types";

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        dockerWrapper: DockerWrapper;
        getStarknetContract: (name: string) => Promise<StarknetContract>;
    }
}
