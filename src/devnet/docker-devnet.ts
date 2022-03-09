import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { DEVNET_DOCKER_REPOSITORY } from "../constants";

import { IntegratedDevnet } from "./integrated-devnet";

const CONTAINER_NAME = "integrated-devnet" as const;

export class DockerDevnet extends IntegratedDevnet {
    private docker: HardhatDocker;

    constructor(private image: Image, host: string, port: string) {
        super(host, port);
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

        console.log(`Starting  the "${CONTAINER_NAME}" Docker container`);

        return spawn("docker", [
            "run",
            "--detach",
            "--rm",
            "--name",
            CONTAINER_NAME,
            "-it",
            "-p",
            `${this.host}:${this.port}:5000`,
            DEVNET_DOCKER_REPOSITORY
        ]);
    }

    protected cleanup(): void {
        console.log(`Killing ${CONTAINER_NAME} Docker container`);
        spawnSync("docker", ["kill", CONTAINER_NAME]);
        this.childProcess.kill();
    }
}
