import { HardhatNetworkConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import { StarknetPluginError } from "../starknet-plugin-error";

import { DEVNET_DOCKER_REPOSITORY, INTEGRATED_DEVNET, INTEGRATED_DEVNET_URL } from "../constants";
import { getDevnetImageTagByArch, getNetwork } from "../utils";
import { DockerDevnet } from "./docker-devnet";
import { VenvDevnet } from "./venv-devnet";
import { ExternalServer } from "./external-server";
import { Image } from "@nomiclabs/hardhat-docker";

function getDevnetImage(dockerizedVersion: string): Image {
    let repository: string = undefined;
    let tag: string = undefined;
    // check if image:tag
    if (dockerizedVersion.includes(":")) {
        const imageParts = dockerizedVersion.split(":");
        if (imageParts.length !== 2) {
            const msg = `Invalid dockerizedVersion: "${dockerizedVersion}". Expected <tag> or <image>:<tag>`;
            throw new StarknetPluginError(msg);
        }
        repository = imageParts[0];
        tag = imageParts[1];
    } else {
        // treat as just tag
        repository = DEVNET_DOCKER_REPOSITORY;
        tag = getDevnetImageTagByArch(dockerizedVersion);
    }

    return { repository, tag };
}

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

    const image = getDevnetImage(devnetNetwork.dockerizedVersion);

    return new DockerDevnet(
        image,
        hostname,
        port,
        devnetNetwork?.args,
        devnetNetwork?.stdout,
        devnetNetwork?.stderr,
        devnetNetwork.vmLang
    );
}
