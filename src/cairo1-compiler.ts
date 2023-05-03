import { BindsMap, HardhatDocker, ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import { Image } from "@nomiclabs/hardhat-docker";

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

export class DockerCairo1Compiler {
    image: Image;
    sources: string[];
    compilerArgs: string[];

    constructor(image: Image, sources: string[], cairo1CompilerArgs?: string[]) {
        this.image = image;
        this.sources = sources;
        this.compilerArgs = cairo1CompilerArgs;
    }

    protected getDockerArgs(): BindsMap {
        const binds: BindsMap = {};
        for (const source of this.sources) {
            binds[source] = source;
        }

        return binds;
    }

    protected getContainerArgs(): string[] {
        return ["/bin/sh", "-c", this.compilerArgs.join(" ")];
    }

    async compileCairo1(): Promise<ProcessResult> {
        const docker = await HardhatDocker.create();
        if (!(await docker.hasPulledImage(this.image))) {
            await docker.pullImage(this.image);
        }

        const { statusCode, stdout, stderr } = await docker.runContainer(
            this.image,
            this.getContainerArgs(),
            {
                binds: this.getDockerArgs()
            }
        );

        return {
            statusCode,
            stdout: Buffer.from(stdout.toString()),
            stderr: Buffer.from(stderr.toString())
        } as ProcessResult;
    }
}
