import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./docker-server";

export class DockerDevnet extends DockerServer {
    constructor(
        image: Image,
        host: string,
        port: string,
        private devnetArgs?: string[],
        stdout?: string,
        stderr?: string
    ) {
        super(image, host, port, "is_alive", "integrated-devnet", devnetArgs, stdout, stderr);
    }

    protected async getDockerArgs(): Promise<string[]> {
        return ["-p", `${this.host}:${this.port}:${this.port}`];
    }

    protected async getContainerArgs(): Promise<string[]> {
        return this.devnetArgs || [];
    }
}
