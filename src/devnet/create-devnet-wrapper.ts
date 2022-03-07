import { DevnetNetworkConfig, HardhatRuntimeEnvironment } from "hardhat/types";

import { DEVNET_DOCKER_REPOSITORY, HARDHAT_STARKNET_DEVNET } from "../constants";
import { getNetwork } from "../utils";
import { DockerDevnet } from "./docker-devnet";
import { VenvDevnet } from "./venv-devnet";
import { DevnetWrapper } from "./devnet-wrapper";

export function createDevnetWrapper(hre: HardhatRuntimeEnvironment): DevnetWrapper {
    const devnetNetwork: DevnetNetworkConfig = getNetwork(
        HARDHAT_STARKNET_DEVNET,
        hre,
        HARDHAT_STARKNET_DEVNET
    );
    const { hostname, port } = new URL(devnetNetwork.url);

    if (devnetNetwork.venv) {
        return new VenvDevnet(devnetNetwork.venv, hostname, port);
    }

    if (devnetNetwork.dockerizedVersion) {
        return new DockerDevnet(
            {
                repository: DEVNET_DOCKER_REPOSITORY,
                tag: devnetNetwork.dockerizedVersion
            },
            hostname,
            port
        );
    }
}
