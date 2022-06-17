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
    console.warn("\x1b[33m%s\x1b[0m", "Warning! Using experimental feature: integrated-devnet");
    const devnetNetwork = getNetwork<HardhatNetworkConfig>(
        INTEGRATED_DEVNET,
        hre.config.networks,
        `networks["${INTEGRATED_DEVNET}"]`
    );
    const { hostname, port } = new URL(devnetNetwork.url || INTEGRATED_DEVNET_URL);

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            "Integrated devnet works only with localhost and 127.0.0.1"
        );
    }

    if (devnetNetwork.venv) {
        return new VenvDevnet(devnetNetwork.venv, hostname, port);
    }

    if (hostname === "localhost") {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            "Dockerized integrated devnet works only with host 127.0.0.1"
        );
    }

    // Check CPU architecture
    const arch = process.arch;
    let tag = devnetNetwork.dockerizedVersion || DEFAULT_DEVNET_DOCKER_IMAGE_TAG;
    if (arch === "arm64") {
        tag = tag.includes("-arm") ? tag : `${tag}-arm`;
    }

    return new DockerDevnet(
        {
            repository: DEVNET_DOCKER_REPOSITORY,
            tag
        },
        hostname,
        port
    );
}
