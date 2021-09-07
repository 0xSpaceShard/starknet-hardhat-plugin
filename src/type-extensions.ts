import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";

declare module "hardhat/types/runtime" {
    export interface HardhatRuntimeEnvironment {
        docker: HardhatDocker;
        dockerImage: Image;
    }
}