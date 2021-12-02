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

function getFullImageName(image: Image): string {
    return `${image.repository}:${image.tag}`;
}

export class DockerWrapper implements StarknetWrapper {
    private docker: HardhatDocker;
    private image: Image;

    constructor(image: Image) {
        this.image = image;
        console.log(`${PLUGIN_NAME} plugin using dockerized environment (${getFullImageName(image)})`);
    }

    private async getDocker() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
            if (!(await this.docker.hasPulledImage(this.image))) {
                console.log(`Pulling image ${getFullImageName(this.image)}`);
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
        let venvPrefix = "";
        if (venvPath === "ACTIVE") {
            console.log(`${PLUGIN_NAME} plugin using ACTIVE environment`);
        } else {
            venvPrefix = path.join(venvPath, "bin");
            console.log(`${PLUGIN_NAME} plugin using environment at ${venvPath}`);
        }

        this.starknetCompilePath = path.join(venvPrefix, "starknet-compile");
        this.starknetPath = path.join(venvPrefix, "starknet");
        checkCommandPath(this.starknetCompilePath);
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
