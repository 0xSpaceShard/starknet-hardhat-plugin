import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";

export interface StarknetWrapper {
    runCommand(command: string[], paths?: string[]): Promise<ProcessResult>;
}

export class DockerWrapper implements StarknetWrapper {
    private docker: HardhatDocker;
    public image: Image;

    constructor(image: Image) {
        this.image = image;
    }

    private async getDocker() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
            if (!(await this.docker.hasPulledImage(this.image))) {
                console.log(`Pulling image ${this.image.repository}:${this.image.tag}`);
                await this.docker.pullImage(this.image);
            }
        }
        return this.docker;
    }

    public async runCommand(command: string[], paths?: string[]) {
        const docker = await this.getDocker();
        const binds: { [path: string]: string } = {};

        if (paths) {
            for (const path of paths) {
                binds[path] = path;
            }
        }

        const options = {
            binds,
            networkMode: "host"
        }
        return docker.runContainer(this.image, command, options);
    }
}
