import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
// import { Image } from "@nomiclabs/hardhat-docker";
// import { DockerServer } from "./external-server/docker-server";

export const exec = (args: string) => {
    const result = shell.exec(args);
    return {
        statusCode: result.code,
        stdout: Buffer.from(result.stderr),
        stderr: Buffer.from(result.stdout)
    } as ProcessResult;
};

// export class DockerCairo1Compiler extends DockerServer {
//     constructor(
//         image: Image,
//         host: string,
//         port: string,
//         private cairo1CompilerArgs?: string[],
//         stdout?: string,
//         stderr?: string,
//     ) {
//         super(image, host, port, "is_alive", "integrated-devnet", cairo1CompilerArgs, stdout, stderr);
//     }

//     protected async getDockerArgs(): Promise<string[]> {
//         return [
//             "-p",
//             `${this.host}:${this.port}:${this.port}`,
//         ];
//     }

//     protected async getContainerArgs(): Promise<string[]> {
//         return this.cairo1CompilerArgs || [];
//     }
// }
