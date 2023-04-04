import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./external-server/docker-server";
import { getFreePort } from "./external-server/external-server";

export const exec = (args: string) => {
    const result = shell.exec(args);
    return {
        statusCode: result.code,
        stdout: Buffer.from(result.stderr),
        stderr: Buffer.from(result.stdout)
    } as ProcessResult;
};

export class DockerCairo1Compiler extends DockerServer {
    constructor(
        image: Image,
        private sources: string[],
        private cairo1CompilerArgs?: string[],
        stdout?: string,
        stderr?: string
    ) {
        super(
            image,
            "127.0.0.1",
            null,
            "",
            "starknet-docker-cairo1-compiler",
            cairo1CompilerArgs,
            stdout,
            stderr
        );
    }

    protected async getDockerArgs(): Promise<string[]> {
        const volumes = [];
        for (const source of this.sources) {
            volumes.push("-v", `${source}:${source}`);
        }

        const dockerArgs = [...volumes];

        if (this.isDockerDesktop) {
            this.port = await this.getPort();
            dockerArgs.push("-p", `${this.port}:${this.port}`);
        } else {
            dockerArgs.push("--network", "host");
        }

        return dockerArgs;
    }

    protected async getContainerArgs(): Promise<string[]> {
        this.port = await this.getPort();
        return ["/bin/sh", "-c", `"${this.cairo1CompilerArgs.join(" ")}"`];
    }

    protected async getPort(): Promise<string> {
        if (!this.port) {
            this.port = await getFreePort();
        }
        return this.port;
    }
}
