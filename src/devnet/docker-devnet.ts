import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { ChildProcess, spawn, spawnSync } from "child_process";

import { ExternalServer } from "./external-server";

const CONTAINER_NAME = "integrated-devnet";
const DEVNET_DOCKER_INTERNAL_PORT = 5050;

export class DockerServer extends ExternalServer {
    private docker: HardhatDocker;

    constructor(
        private image: Image,
        host: string,
        externalPort: string,
        private internalPort: string,
        isAliveURL: string,
        containerName: string,
        protected args?: string[],
        stdout?: string,
        stderr?: string
    ) {
        super(host, externalPort, isAliveURL, containerName, stdout, stderr);
        this.args = args;
    }

    private async pullImage() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
        }

        if (!(await this.docker.hasPulledImage(this.image))) {
            console.log(`Pulling image ${HardhatDocker.imageToRepoTag(this.image)}`);
            await this.docker.pullImage(this.image);
        }
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        await this.pullImage();

        const formattedImage = `${this.image.repository}:${this.image.tag}`;
        console.log(`Starting the "${CONTAINER_NAME}" Docker container (${formattedImage})`);
        const args = [
            "run",
            "--rm",
            "--name",
            CONTAINER_NAME,
            "-p",
            `${this.host}:${this.port}:${this.internalPort}`,
            formattedImage
        ].concat(this.args || []);
        return spawn("docker", args);
    }

    protected cleanup(): void {
        console.log(`Killing ${CONTAINER_NAME} Docker container`);
        spawnSync("docker", ["kill", CONTAINER_NAME]);
        this.childProcess?.kill();
    }
}

export class DockerDevnet extends DockerServer {
    constructor(image: Image, host: string, port: string, args?: string[]) {
        super(
            image,
            host,
            port,
            DEVNET_DOCKER_INTERNAL_PORT.toString(),
            "is_alive",
            "integrated-devnet",
            args
        );
        this.args = args;
    }
}
