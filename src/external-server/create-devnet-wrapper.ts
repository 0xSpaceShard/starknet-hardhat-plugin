import { HardhatNetworkConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { StarknetPluginError } from "../starknet-plugin-error";

import { DEVNET_DOCKER_REPOSITORY, INTEGRATED_DEVNET, INTEGRATED_DEVNET_URL } from "../constants";
import { getCairoCliImageTagByArch, getNetwork } from "../utils";
import { DockerDevnet } from "./docker-devnet";
import { VenvDevnet } from "./venv-devnet";
import { ExternalServer } from "./external-server";

export function createIntegratedDevnet(hre: HardhatRuntimeEnvironment): ExternalServer {
    const devnetNetwork = getNetwork<HardhatNetworkConfig>(
        INTEGRATED_DEVNET,
        hre.config.networks,
        `networks["${INTEGRATED_DEVNET}"]`
    );
    const { hostname, port } = new URL(devnetNetwork.url || INTEGRATED_DEVNET_URL);

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        throw new StarknetPluginError("Integrated devnet works only with localhost and 127.0.0.1");
    }

    if (devnetNetwork.venv) {
        return new VenvDevnet(
            devnetNetwork.venv,
            hostname,
            port,
            devnetNetwork?.args,
            devnetNetwork?.stdout,
            devnetNetwork?.stderr,
            devnetNetwork.vmLang
        );
    }

    if (hostname === "localhost") {
        throw new StarknetPluginError(
            "Dockerized integrated devnet works only with host 127.0.0.1"
        );
    }

    const tag = getCairoCliImageTagByArch(devnetNetwork.dockerizedVersion);
    return new DockerDevnet(
        {
            repository: DEVNET_DOCKER_REPOSITORY,
            tag
        },
        hostname,
        port,
        devnetNetwork?.args,
        devnetNetwork?.stdout,
        devnetNetwork?.stderr,
        devnetNetwork.vmLang
    );
}
