import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { ChildProcess, spawn } from "child_process";

import { DevnetWrapper } from "./devnet-wrapper";

const CONTAINER_NAME = `hardhat-starknet-devnet` as const;

export class DockerDevnet extends DevnetWrapper {
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

        console.log(`Starting docker container named ${CONTAINER_NAME}`);

        return spawn("docker", [
            "run",
            "--detach",
            "--rm",
            "--name",
            CONTAINER_NAME,
            "-it",
            "-p",
            `${this.port}:5000`,
            "shardlabs/starknet-devnet"
        ]);
    }

    protected async beforeStop(): Promise<void> {
        console.log(`Killing ${CONTAINER_NAME} Docker container`);
        const killContainer = spawn("docker", ["kill", CONTAINER_NAME]);

        return new Promise((resolve, reject) => {
            killContainer.on("spawn", () => {
                console.log(`Removed ${CONTAINER_NAME} Docker container`);
                resolve();
            });

            killContainer.on("error", (error) => {
                console.error(`Failed to remove ${CONTAINER_NAME} Docker container`);
                reject(error);
            });
        });
    }
}
