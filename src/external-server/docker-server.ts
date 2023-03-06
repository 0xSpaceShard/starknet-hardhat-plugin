import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { ExternalServer } from "./external-server";

export abstract class DockerServer extends ExternalServer {
    private docker: HardhatDocker;
    protected containerName: string;

    constructor(
        protected image: Image,
        host: string,
        externalPort: string,
        isAliveURL: string,
        containerName: string,
        protected args?: string[],
        stdout?: string,
        stderr?: string
    ) {
        // to make name unique and allow multiple simultaneous instances
        containerName += "-" + Math.random().toString().slice(2);
        super(host, externalPort, isAliveURL, containerName, stdout, stderr);
        this.containerName = containerName;
    }

    protected async pullImage() {
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
        const args = [
            "run",
            "--rm",
            "--name",
            this.containerName,
            ...(await this.getDockerArgs()),
            formattedImage,
            ...(await this.getContainerArgs())
        ];
        return spawn("docker", args);
    }

    /**
     * CLI arguments passed to the `docker` command.
     */
    protected abstract getDockerArgs(): Promise<Array<string>>;

    /**
     * CLI arguments passed to the docker container.
     */
    protected abstract getContainerArgs(): Promise<Array<string>>;

    protected cleanup(): void {
        spawnSync("docker", ["kill", this.containerName]);
        this.childProcess?.kill();
    }
}
