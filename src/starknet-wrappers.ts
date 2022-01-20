import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { HardhatPluginError } from "hardhat/plugins";
import * as path from "path";
import { PLUGIN_NAME } from "./constants";
import { Choice } from "./types";
import { adaptUrl } from "./utils";

export interface CompileOptions {
    file: string,
    output: string,
    abi: string,
    cairoPath: string,
}
export interface CleanOptions {
    file: string
}

export interface DeployOptions {
    contract: string,
    gatewayUrl: string,
    inputs?: string[],
    salt?: string
}

export interface InvokeOrCallOptions {
    choice: Choice,
    address: string,
    abi: string,
    functionName: string,
    inputs?: string[],
    signature?: string[],
    gatewayUrl: string,
    feederGatewayUrl: string,
}

export interface GetTxStatusOptions {
    hash: string,
    gatewayUrl: string,
    feederGatewayUrl: string,
}

export abstract class StarknetWrapper {
    protected prepareCompileOptions(options: CompileOptions): string[] {
        return [
            options.file,
            "--abi", options.abi,
            "--output", options.output,
            "--cairo_path", options.cairoPath
        ];
    }

    public abstract compile(options: CompileOptions): Promise<ProcessResult>;

    protected prepareDeployOptions(options: DeployOptions): string[] {
        const prepared = [
            "deploy",
            "--contract", options.contract,
            "--gateway_url", options.gatewayUrl
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.salt) {
            prepared.push("--salt",  options.salt);
        }

        return prepared;
    }
 protected prepareCleanOptions(options: CleanOptions): string[] {
        const prepared = [
            options.file
        ];
        return prepared;
    }
    public abstract deploy(options: DeployOptions): Promise<ProcessResult>;
      public abstract clean(options: CleanOptions): Promise<ProcessResult>;

    protected prepareInvokeOrCallOptions(options: InvokeOrCallOptions): string[] {
        const prepared = [
            options.choice,
            "--abi", options.abi,
            "--feeder_gateway_url", options.feederGatewayUrl,
            "--gateway_url", options.gatewayUrl,
            "--function", options.functionName,
            "--address", options.address
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.signature && options.signature.length) {
            prepared.push("--signature", ...options.signature);
        }

        return prepared;
    }

    public abstract invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult>;

    protected prepareGetTxStatusOptions(options: GetTxStatusOptions): string[] {
        return [
            "tx_status",
            "--hash", options.hash,
            "--gateway_url", options.gatewayUrl,
            "--feeder_gateway_url", options.feederGatewayUrl
        ];
    }

    public abstract getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult>;
}

function getFullImageName(image: Image): string {
    return `${image.repository}:${image.tag}`;
}

type String2String = { [path: string]: string };

/**
 * Populate `paths` with paths from `colonSeparatedStr`.
 * `paths` maps a path to itself.
 * @param paths
 * @param colonSeparatedStr
 */
function addPaths(paths: String2String, colonSeparatedStr: string): void {
    for (let p of colonSeparatedStr.split(":")) {
        if (!path.isAbsolute(p)) {
            throw new HardhatPluginError(PLUGIN_NAME, `Path is not absolute: ${p}`);
        }

        // strip trailing slash(es)
        p = p.replace(/\/*$/, "");

        // duplicate paths will cause errors
        if (`${p}/` in paths) {
            continue;
        }
        paths[p] = p;
    }
}

export class DockerWrapper extends StarknetWrapper {
    private docker: HardhatDocker;
    private image: Image;

    constructor(image: Image) {
        super();
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
        const binds: String2String = {
            [options.file]: options.file,
            [options.abi]: options.abi,
            [options.output]: options.output
        };

        addPaths(binds, options.cairoPath);

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        const preparedOptions = this.prepareCompileOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(this.image, ["starknet-compile", ...preparedOptions], dockerOptions);
        return executed;
    }

    public async deploy(options: DeployOptions): Promise<ProcessResult> {
        const binds: String2String = {
            [options.contract]: options.contract
        };

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareDeployOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(this.image, ["starknet", ...preparedOptions], dockerOptions);
        return executed;
    }
     public async clean(options: CleanOptions): Promise<ProcessResult> {
       const binds: String2String = {
            [options.file]: options.file
        };


        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        const preparedOptions = this.prepareCleanOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(this.image, ["starknet-clean", ...preparedOptions], dockerOptions);
        return executed;
    }

    public async invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult> {
        const binds: String2String = {
            [options.abi]: options.abi
        };

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareInvokeOrCallOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(this.image, ["starknet", ...preparedOptions], dockerOptions);
        return executed;
    }

    public async getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult> {
        const binds: String2String = {};

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        const preparedOptions = this.prepareGetTxStatusOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(this.image, ["starknet", ...preparedOptions], dockerOptions);
        return executed;
    }
}

function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Command ${commandPath} not found.`);
    }
}

export class VenvWrapper extends StarknetWrapper {
    private starknetCompilePath: string;
    private starknetPath: string;

    constructor(venvPath: string) {
        super();
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
    }

    private async execute(commandPath: string, preparedOptions: string[]): Promise<ProcessResult> {
        const process = spawnSync(commandPath, preparedOptions);
        if (!process.stdout) {
            const msg = `${commandPath} not found. Check that your Python virtual environment has 'cairo-lang' installed.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        return {
            statusCode: process.status,
            stdout: process.stdout,
            stderr: process.stderr
        };
    }

    public async compile(options: CompileOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareCompileOptions(options);
        const executed = await this.execute(this.starknetCompilePath, preparedOptions);
        return executed;
    }

    public async deploy(options: DeployOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareDeployOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }
     public async clean(options: CleanOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareCleanOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }
    public async invokeOrCall(options: InvokeOrCallOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareInvokeOrCallOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }

    public async getTxStatus(options: GetTxStatusOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareGetTxStatusOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }
}
