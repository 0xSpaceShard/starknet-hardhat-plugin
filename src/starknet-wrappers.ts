import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { HardhatPluginError } from "hardhat/plugins";
import * as path from "path";
import { PLUGIN_NAME } from "./constants";
import { Choice } from "./types";

export type StarknetCommand = "starknet" | "starknet-compile";

export interface CompileOptions {
    file: string,
    output: string,
    abi: string,
    cairoPath: string,
}

export interface DeployOptions {
    contract: string,
    gatewayUrl: string,
    inputs: string[],
    signature?: string[],
}

export interface InvokeOrCallOptions {
    choice: Choice,
    address: string,
    abi: string,
    functionName: string,
    inputs: string[],
    signature: string[],
    gatewayUrl: string,
    feederGatewayUrl: string,
}

export interface GetTxStatusOptions {
    hash: string,
    gatewayUrl: string,
    feederGatewayUrl: string,
}

export interface StarknetWrapper {
    compile(options: CompileOptions): Promise<ProcessResult>;

    deploy(options: DeployOptions): Promise<ProcessResult>;

    invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult>;

    getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult>;
}

function getFullImageName(image: Image): string {
    return `${image.repository}:${image.tag}`;
}

/**
 * Populate `paths` with paths from `colonSeparatedStr`.
 * @param paths
 * @param colonSeparatedStr
 */
 function addPaths(paths: string[], colonSeparatedStr: string): void {
    for (let p of colonSeparatedStr.split(":")) {
        if (!path.isAbsolute(p)) {
            throw new HardhatPluginError(PLUGIN_NAME, `Path is not absolute: ${p}`);
        }

        // strip trailing slash(es)
        p = p.replace(/\/*$/, "");

        // duplicate paths will cause errors
        if (paths.indexOf(`${p}/`) !== -1) {
            continue;
        }
        paths.push(p)
    }
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

    public async compile(options: CompileOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }

    public async deploy(options: DeployOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }

    public async invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }

    public async getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
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
        if (venvPath === "active") {
            console.log(`${PLUGIN_NAME} plugin using the active environment.`);
            this.starknetCompilePath = "starknet-compile";
            this.starknetPath = "starknet";
        } else {
            console.log(`${PLUGIN_NAME} plugin using environment at ${venvPath}`);

            venvPrefix = path.join(venvPath, "bin");

            this.starknetCompilePath = path.join(venvPrefix, "starknet-compile");
            checkCommandPath(this.starknetCompilePath);

            this.starknetPath = path.join(venvPrefix, "starknet");
            checkCommandPath(this.starknetPath);
        }

        this.command2path = new Map([
            ["starknet", this.starknetPath],
            ["starknet-compile", this.starknetCompilePath]
        ]);
    }
    compile(options: CompileOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }
    deploy(options: DeployOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }
    invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }
    getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult> {
        throw new Error("Method not implemented.");
    }

    public async runCommand(command: StarknetCommand, args: string[], _paths?: string[]): Promise<ProcessResult> {
        const commandPath = this.command2path.get(command);
        const process = spawnSync(commandPath, args);
        if (!process.stdout){
            const msg = "Command not found. Check that your Python virtual environment has 'cairo-lang' installed.";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        return {
            statusCode: process.status,
            stdout: process.stdout,
            stderr: process.stderr
        };
    }
}
