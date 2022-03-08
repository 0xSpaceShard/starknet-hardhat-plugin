import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { HardhatPluginError } from "hardhat/plugins";
import * as path from "path";
import { PLUGIN_NAME } from "./constants";
import { Choice } from "./types";
import { adaptUrl } from "./utils";

interface CompileWrapperOptions {
    file: string;
    output: string;
    abi: string;
    cairoPath: string;
}

interface DeployWrapperOptions {
    contract: string;
    gatewayUrl: string;
    inputs?: string[];
    salt?: string;
}

interface InvokeOrCallWrapperOptions {
    choice: Choice;
    address: string;
    abi: string;
    functionName: string;
    inputs?: string[];
    signature?: string[];
    wallet?: string;
    account?: string;
    accountDir?: string;
    networkID?: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    blockNumber?: string;
}

interface GetTxStatusWrapperOptions {
    hash: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
}

interface DeployAccountWrapperOptions {
    wallet: string;
    accountName: string;
    accountDir: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    network: string;
}

export abstract class StarknetWrapper {
    protected prepareCompileOptions(options: CompileWrapperOptions): string[] {
        return [
            options.file,
            "--abi",
            options.abi,
            "--output",
            options.output,
            "--cairo_path",
            options.cairoPath
        ];
    }

    public abstract compile(options: CompileWrapperOptions): Promise<ProcessResult>;

    protected prepareDeployOptions(options: DeployWrapperOptions): string[] {
        const prepared = [
            "deploy",
            "--contract",
            options.contract,
            "--gateway_url",
            options.gatewayUrl
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.salt) {
            prepared.push("--salt", options.salt);
        }

        return prepared;
    }

    public abstract deploy(options: DeployWrapperOptions): Promise<ProcessResult>;

    protected prepareInvokeOrCallOptions(options: InvokeOrCallWrapperOptions): string[] {
        const prepared = [
            options.choice,
            "--abi",
            options.abi,
            "--feeder_gateway_url",
            options.feederGatewayUrl,
            "--gateway_url",
            options.gatewayUrl,
            "--function",
            options.functionName,
            "--address",
            options.address
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.signature && options.signature.length) {
            prepared.push("--signature", ...options.signature);
        }

        if (options.blockNumber) {
            prepared.push("--block_number", options.blockNumber);
        }
        if (options.wallet) {
            prepared.push("--wallet", options.wallet);
            prepared.push("--network_id", options.networkID);

            if (options.account) {
                prepared.push("--account", options.account);
            }
            if (options.accountDir) {
                prepared.push("--account_dir", options.accountDir);
            }
        } else {
            prepared.push("--no_wallet");
        }

        return prepared;
    }

    public abstract invokeOrCall(options: InvokeOrCallWrapperOptions): Promise<ProcessResult>;

    protected prepareGetTxStatusOptions(options: GetTxStatusWrapperOptions): string[] {
        return [
            "tx_status",
            "--hash",
            options.hash,
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl
        ];
    }

    public abstract getTxStatus(options: GetTxStatusWrapperOptions): Promise<ProcessResult>;

    protected getPythonDeployAccountScript(options: DeployAccountWrapperOptions): string {
        const wallet = options.wallet ? "'" + options.wallet + "'" : "None";
        const accountName = options.accountName ? "'" + options.accountName + "'" : "'__default__'";
        const accountDir = options.accountDir ? "'" + options.accountDir + "'" : "None";
        const gateway_url = "'" + options.gatewayUrl + "/gateway'";
        const feeder_gateway_url = "'" + options.feederGatewayUrl + "/feeder_gateway'";
        const network = "'" + options.network + "'";

        const args = [
            `network=${network}`,
            `network_id=${network}`,
            `wallet=${wallet}`,
            `account=${accountName}`,
            `account_dir=${accountDir}`,
            "flavor=None",
            `gateway_url=${gateway_url}`,
            `feeder_gateway_url=${feeder_gateway_url}`,
            "command='deploy_account'"
        ];

        let script = `import asyncio
        from argparse import Namespace
        from starkware.starknet.cli.starknet_cli import deploy_account
        asyncio.run(deploy_account(Namespace(${args.join(",")}),[]))`;
        script = script.replace(/(?:\r\n|\r|\n)/g, ";");
        return script;
    }
    public abstract deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult>;
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
        console.log(
            `${PLUGIN_NAME} plugin using dockerized environment (${getFullImageName(image)})`
        );
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

    public async compile(options: CompileWrapperOptions): Promise<ProcessResult> {
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
        const executed = await docker.runContainer(
            this.image,
            ["starknet-compile", ...preparedOptions],
            dockerOptions
        );
        return executed;
    }

    public async deploy(options: DeployWrapperOptions): Promise<ProcessResult> {
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
        const executed = await docker.runContainer(
            this.image,
            ["starknet", ...preparedOptions],
            dockerOptions
        );
        return executed;
    }

    public async invokeOrCall(options: InvokeOrCallWrapperOptions): Promise<ProcessResult> {
        const binds: String2String = {
            [options.abi]: options.abi
        };

        if (options.accountDir) {
            binds[options.accountDir] = options.accountDir;
        }

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareInvokeOrCallOptions(options);
        const docker = await this.getDocker();
        const executed = await docker.runContainer(
            this.image,
            ["starknet", ...preparedOptions],
            dockerOptions
        );
        return executed;
    }

    public async getTxStatus(options: GetTxStatusWrapperOptions): Promise<ProcessResult> {
        const binds: String2String = {};

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        const preparedOptions = this.prepareGetTxStatusOptions(options);

        const docker = await this.getDocker();
        const executed = await docker.runContainer(
            this.image,
            ["starknet", ...preparedOptions],
            dockerOptions
        );
        return executed;
    }

    public async deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult> {
        const binds: String2String = {
            [options.accountDir]: options.accountDir
        };

        const dockerOptions = {
            binds,
            networkMode: "host"
        };

        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const deployAccountScript = this.getPythonDeployAccountScript(options);
        const docker = await this.getDocker();
        const executed = await docker.runContainer(
            this.image,
            ["python", "-c", deployAccountScript],
            dockerOptions
        );
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
        if (venvPath === "active") {
            console.log(`${PLUGIN_NAME} plugin using the active environment.`);
            this.starknetCompilePath = "starknet-compile";
            this.starknetPath = "starknet";
        } else {
            if (venvPath[0] === "~") {
                venvPath = path.join(process.env.HOME, venvPath.slice(1));
            }
            venvPath = path.normalize(venvPath);
            console.log(`${PLUGIN_NAME} plugin using environment at ${venvPath}`);

            const venvPrefix = path.join(venvPath, "bin");

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

    public async compile(options: CompileWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareCompileOptions(options);
        const executed = await this.execute(this.starknetCompilePath, preparedOptions);
        return executed;
    }

    public async deploy(options: DeployWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareDeployOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }

    public async invokeOrCall(options: InvokeOrCallWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareInvokeOrCallOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }

    public async getTxStatus(options: GetTxStatusWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareGetTxStatusOptions(options);
        const executed = await this.execute(this.starknetPath, preparedOptions);
        return executed;
    }

    public async deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult> {
        const deployAccountScript = this.getPythonDeployAccountScript(options);
        const executed = await this.execute("python", ["-c", deployAccountScript]);
        return executed;
    }
}
