import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./external-server/docker-server";
import { CommonSpawnOptions } from "child_process";

export const exec = (args: string) => {
    const result = shell.exec(args, {
        silent: true
    });

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
        return dockerArgs;
    }

    protected async getContainerArgs(): Promise<string[]> {
        return ["/bin/sh", "-c", `"${this.cairo1CompilerArgs.join(" ")}"`];
    }

    async compileCairo1(options?: CommonSpawnOptions): Promise<ProcessResult> {
        const res = await this.spawnChildProcess(options);
        const stdout: string[] = [];
        const stderr: string[] = [];
        let statusCode;

        res.stdout.on("data", (chunk) => {
            stdout.push(chunk);
            console.log(chunk.toString());
        });

        res.stderr.on("data", (chunk) => {
            stderr.push(chunk);
            console.log(chunk.toString());
        });

        await new Promise((resolve, reject) => {
            res.on("close", (code) => {
                statusCode = code;
                resolve(code);
            });

            res.on("error", (error) => {
                reject(error);
            });
        });

        return {
            statusCode,
            stdout: Buffer.from(stdout.toString()),
            stderr: Buffer.from(stderr.toString())
        } as ProcessResult;
    }
}
