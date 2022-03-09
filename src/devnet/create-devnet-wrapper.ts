import { HardhatNetworkConfig, HardhatRuntimeEnvironment } from "hardhat/types";

import { DEVNET_DOCKER_REPOSITORY, INTEGRATED_DEVNET, INTEGRATED_DEVNET_URL } from "../constants";
import { getNetwork } from "../utils";
import { DockerDevnet } from "./docker-devnet";
import { VenvDevnet } from "./venv-devnet";
import { DevnetWrapper } from "./devnet-wrapper";

export function createDevnetWrapper(hre: HardhatRuntimeEnvironment): DevnetWrapper {
    const devnetNetwork = getNetwork<HardhatNetworkConfig>(
        INTEGRATED_DEVNET,
        hre,
        INTEGRATED_DEVNET
    );
    const { hostname, port } = new URL(INTEGRATED_DEVNET_URL);

    if (devnetNetwork.venv) {
        return new VenvDevnet(devnetNetwork.venv, hostname, port);
    }

    return new DockerDevnet(
        {
            repository: DEVNET_DOCKER_REPOSITORY,
            tag: devnetNetwork.dockerizedVersion || "latest"
        },
        hostname,
        port
    );
}
