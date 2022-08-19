import { Image } from "@nomiclabs/hardhat-docker";
import path from "path";
import { DockerServer } from "./external-server/docker-server";
import { getFreePort } from "./external-server/external-server";

const PROXY_SERVER_FILE = "starknet_cli_wrapper.py";
const PROXY_SERVER_HOST_PATH = path.join(__dirname, PROXY_SERVER_FILE);
const PROXY_SERVER_CONTAINER_PATH = `/${PROXY_SERVER_FILE}`;

export class StarknetDockerProxy extends DockerServer {
    constructor(
        image: Image,
        private rootPath: string,
        private accountPaths: string[],
        private cairoPaths: string[]
    ) {
        super(image, "127.0.0.1", null, "", "starknet-docker-proxy");
    }

    protected async getDockerArgs(): Promise<string[]> {
        const volumes = ["-v", `${PROXY_SERVER_HOST_PATH}:${PROXY_SERVER_CONTAINER_PATH}`];
        for (const mirroredPath of [this.rootPath, ...this.accountPaths, ...this.cairoPaths]) {
            volumes.push("-v", `${mirroredPath}:${mirroredPath}`);
        }

        return [...volumes, "--network", "host"];
    }

    protected async getImageArgs(): Promise<string[]> {
        this.port = await getFreePort();
        return ["python", PROXY_SERVER_CONTAINER_PATH, this.port];
    }
}
