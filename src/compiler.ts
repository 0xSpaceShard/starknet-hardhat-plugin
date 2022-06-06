import * as path from "path";
import { spawnSync } from "child_process";
import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { HardhatPluginError } from "hardhat/plugins";

import { PLUGIN_NAME } from "./constants";
import { getPrefixedCommand, normalizeVenvPath } from "./utils/venv";

interface CompileOptions {
    file: string;
    output: string;
    abi: string;
    cairoPath: string;
    accountContract: boolean;
    disableHintValidation: boolean;
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

export abstract class StarknetCompiler {
    protected prepareCompileOptions(options: CompileOptions): string[] {
        const ret = [
            options.file,
            "--abi",
            options.abi,
            "--output",
            options.output,
            "--cairo_path",
            options.cairoPath
        ];

        if (options.accountContract) {
            ret.push("--account_contract");
        }

        if (options.disableHintValidation) {
            ret.push("--disable_hint_validation");
        }

        return ret;
    }

    public abstract compile(options: CompileOptions): Promise<ProcessResult>;
}

export class DockerCompiler extends StarknetCompiler {
    private docker: HardhatDocker;
    private image: Image;

    constructor(image: Image) {
        super();
        this.image = image;
        `${PLUGIN_NAME} plugin using dockerized environment (${HardhatDocker.imageToRepoTag(
            image
        )}`;
    }

    private async getDocker() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
            if (!(await this.docker.hasPulledImage(this.image))) {
                console.log(`Pulling image ${HardhatDocker.imageToRepoTag(this.image)}`);
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
        const executed = await docker.runContainer(
            this.image,
            ["starknet-compile", ...preparedOptions],
            dockerOptions
        );
        return executed;
    }
}

export class VenvCompiler extends StarknetCompiler {
    private starknetCompilePath: string;

    constructor(venvPath: string) {
        super();

        if (venvPath === "active") {
            console.log(`${PLUGIN_NAME} plugin using the active environment.`);
            this.starknetCompilePath = "starknet-compile";
        } else {
            venvPath = normalizeVenvPath(venvPath);
            console.log(`${PLUGIN_NAME} plugin using environment at ${venvPath}`);

            this.starknetCompilePath = getPrefixedCommand(venvPath, "starknet-compile");
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
}
