import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { HardhatPluginError } from "hardhat/plugins";
import * as path from "path";
import { PLUGIN_NAME } from "./constants";

export type StarknetCommand = "starknet" | "starknet-compile";

export interface StarknetWrapper {
    runCommand(command: StarknetCommand, args: string[], paths?: string[]): Promise<ProcessResult>;
}

export class DockerWrapper implements StarknetWrapper {
    private docker: HardhatDocker;
    private image: Image;

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

    public async runCommand(command: StarknetCommand, args: string[], paths?: string[]) {
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

        return docker.runContainer(this.image, [command, ...args], options);
    }
}

function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Command ${commandPath} not found.`);
    }
}

export class VenvWrapper implements StarknetWrapper {
    private starknetCompilePath: string;
    private starknetPath: string;

    private command2path: Map<StarknetCommand, string>;

    constructor(venvPath: string) {
        this.starknetCompilePath = path.join(venvPath, "bin", "starknet-compile");
        checkCommandPath(this.starknetCompilePath);

        this.starknetPath = path.join(venvPath, "bin", "starknet");
        checkCommandPath(this.starknetPath);

        this.command2path = new Map([
            ["starknet", this.starknetPath],
            ["starknet-compile", this.starknetCompilePath]
        ]);
    }

    public async runCommand(command: StarknetCommand, args: string[], _paths?: string[]): Promise<ProcessResult> {
        const commandPath = this.command2path.get(command);
        const process = spawnSync(commandPath, args);
        return {
            statusCode: process.status,
            stdout: process.stdout,
            stderr: process.stderr
        };
    }
}
