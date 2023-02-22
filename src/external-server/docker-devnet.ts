import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./docker-server";

export class DockerDevnet extends DockerServer {
    private vmLang?: string;

    constructor(
        image: Image,
        host: string,
        port: string,
        private devnetArgs?: string[],
        stdout?: string,
        stderr?: string,
        vmLang?: string
    ) {
        super(image, host, port, "is_alive", "integrated-devnet", devnetArgs, stdout, stderr);
        this.vmLang = vmLang;
    }

    protected async getDockerArgs(): Promise<string[]> {
        return [
            "-p",
            `${this.host}:${this.port}:${this.port}`,
            "-e",
            `STARKNET_DEVNET_CAIRO_VM=${this.vmLang}`
        ];
    }

    protected async getContainerArgs(): Promise<string[]> {
        return this.devnetArgs || [];
    }
}
