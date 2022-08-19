import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { ExternalServer } from "./external-server";

// eslint-disable-next-line no-warning-comments
// TODO rename this file or move something

export abstract class DockerServer extends ExternalServer {
    private docker: HardhatDocker;
    private containerName: string;

    constructor(
        private image: Image,
        host: string,
        externalPort: string,
        isAliveURL: string,
        containerName: string,
        protected args?: string[],
        stdout?: string,
        stderr?: string
    ) {
        containerName += "-" + Date.now();
        super(host, externalPort, isAliveURL, containerName, stdout, stderr);
        this.containerName = containerName;
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
        const args = [
            "run",
            "--rm",
            "--name",
            this.containerName,
            ...(await this.getDockerArgs()),
            formattedImage,
            ...(await this.getImageArgs())
        ];
        return spawn("docker", args);
    }

    protected abstract getDockerArgs(): Promise<Array<string>>;

    protected abstract getImageArgs(): Promise<Array<string>>;

    protected cleanup(): void {
        spawnSync("docker", ["kill", this.containerName]);
        this.childProcess?.kill();
    }
}

export class DockerDevnet extends DockerServer {
    constructor(image: Image, host: string, port: string, private devnetArgs?: string[], stdout?: string, stderr?: string) {
        super(image, host, port, "is_alive", "integrated-devnet", devnetArgs, stdout, stderr);
    }

    protected async getDockerArgs(): Promise<string[]> {
        return ["-p", `${this.host}:${this.port}:${this.port}`];
    }

    protected async getImageArgs(): Promise<string[]> {
        return this.devnetArgs || [];
    }
}
