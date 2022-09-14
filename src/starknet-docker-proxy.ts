import { Image } from "@nomiclabs/hardhat-docker";
import path from "path";
import { DockerServer } from "./external-server/docker-server";
import { getFreePort } from "./external-server/external-server";

const PROXY_SERVER_FILE = "starknet_cli_wrapper.py";
const PROXY_SERVER_HOST_PATH = path.join(__dirname, PROXY_SERVER_FILE);
const PROXY_SERVER_CONTAINER_PATH = `/${PROXY_SERVER_FILE}`;

export class StarknetDockerProxy extends DockerServer {
    /**
     * @param image the Docker image to be used for running the container
     * @param rootPath the hardhat project root
     * @param accountPaths the paths holding wallet information
     * @param cairoPaths the paths specified in hardhat config cairoPaths
     */
    constructor(
        image: Image,
        private rootPath: string,
        private accountPaths: string[],
        private cairoPaths: string[]
    ) {
        super(image, "127.0.0.1", null, "", "starknet-docker-proxy");
    }

    protected async getDockerArgs(): Promise<string[]> {
        // To access the files on host machine from inside the container, proper mounting has to be done.

        const volumes = ["-v", `${PROXY_SERVER_HOST_PATH}:${PROXY_SERVER_CONTAINER_PATH}`];

        for (const mirroredPath of [this.rootPath, ...this.accountPaths, ...this.cairoPaths]) {
            volumes.push("-v", `${mirroredPath}:${mirroredPath}`);
        }

        this.port = await getFreePort();
        return [...volumes, "-p", `${this.port}:${this.port}`];
    }

    protected async getContainerArgs(): Promise<string[]> {
        this.port = await getFreePort();
        return ["python3", PROXY_SERVER_CONTAINER_PATH, this.port];
    }
}
