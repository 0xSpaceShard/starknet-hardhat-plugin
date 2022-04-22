import { HardhatNetworkConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";

import {
    DEFAULT_DEVNET_DOCKER_IMAGE_TAG,
    DEVNET_DOCKER_REPOSITORY,
    INTEGRATED_DEVNET,
    INTEGRATED_DEVNET_URL,
    PLUGIN_NAME
} from "../constants";
import { getNetwork } from "../utils";
import { DockerDevnet } from "./docker-devnet";
import { VenvDevnet } from "./venv-devnet";
import { IntegratedDevnet } from "./integrated-devnet";

export function createIntegratedDevnet(hre: HardhatRuntimeEnvironment): IntegratedDevnet {
    const devnetNetwork = getNetwork<HardhatNetworkConfig>(
        INTEGRATED_DEVNET,
        hre.config.networks,
        `networks["${INTEGRATED_DEVNET}"]`
    );
    const { hostname, port } = new URL(devnetNetwork.url || INTEGRATED_DEVNET_URL);

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        throw new HardhatPluginError(PLUGIN_NAME, "Integreated devnet works only with localhost");
    }

    if (devnetNetwork.venv) {
        return new VenvDevnet(devnetNetwork.venv, hostname, port);
    }

    if (hostname === "localhost") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            "Docker integrated devnet works only with 127.0.0.1 host"
        );
    }

    return new DockerDevnet(
        {
            repository: DEVNET_DOCKER_REPOSITORY,
            tag: devnetNetwork.dockerizedVersion || DEFAULT_DEVNET_DOCKER_IMAGE_TAG
        },
        hostname,
        port
    );
}
