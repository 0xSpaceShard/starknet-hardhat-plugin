import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { StarknetPluginError } from "./starknet-plugin-error";
import {
    CAIRO1_COMPILE_BIN,
    CAIRO1_SIERRA_COMPILE_BIN,
    DOCKER_HOST_BIN_PATH,
    PLUGIN_NAME
} from "./constants";
import path from "path";
import { DockerCairo1Compiler, exec } from "./cairo1-compiler";

interface CairoToSierraOptions {
    path: string;
    output: string;
    binDirPath?: string;
    replaceIds?: boolean;
    allowedLibfuncsListName?: string;
    allowedLibfuncsListFile?: string;
}

interface SierraToCasmOptions {
    file: string;
    output: string;
    binDirPath?: string;
    allowedLibfuncsListName?: string;
    allowedLibfuncsListFile?: string;
    addPythonicHints?: boolean;
}

export abstract class CairoWrapper {
    private static instance: CairoWrapper;

    static getInstance(cliArgs: TaskArguments, hre: HardhatRuntimeEnvironment): CairoWrapper {
        if (this.instance) {
            return this.instance;
        } else if (cliArgs.cairo1BinDir) {
            this.instance = new CustomCairoWrapper(cliArgs.cairo1BinDir);
        } else if (hre.config.starknet.scarbCommand) {
            this.instance = new CustomCairoWrapper(hre.config.starknet.cairo1BinDir);
        } else {
            this.instance = new DockerizedCairoWrapper(
                hre.config.starknet.dockerizedVersion,
                hre.config.paths.root
            );
        }
        return this.instance;
    }

    // TODO --single-file

    protected prepareCairoToSierraOptions(options: CairoToSierraOptions): string[] {
        const args = [];

        if (options?.replaceIds === true) {
            args.push("-r");
        }

        if (options.allowedLibfuncsListName) {
            args.push("--allowed-libfuncs-list-name", options.allowedLibfuncsListName);
        }

        if (options.allowedLibfuncsListFile) {
            args.push("--allowed-libfuncs-list-file", options.allowedLibfuncsListFile);
        }

        args.push(options.path);

        if (options.output) {
            args.push(options.output);
        }

        return args;
    }

    protected prepareSierraToCasmOptions(options: SierraToCasmOptions): string[] {
        const args = [];
        if (options.allowedLibfuncsListName) {
            args.push("--allowed-libfuncs-list-name", options.allowedLibfuncsListName);
        }

        if (options.allowedLibfuncsListFile) {
            args.push("--allowed-libfuncs-list-file", options.allowedLibfuncsListFile);
        }

        if (options?.addPythonicHints === true) {
            args.push("--add-pythonic-hints");
        }

        args.push(options.file);

        if (options.output) {
            args.push(options.output);
        }

        return args;
    }

    protected getCairo1Command(binDirPath: string, binCommand: string, args: string[]): string[] {
        // TODO not needed
        if (!binDirPath) {
            const msg =
                "No compiler bin directory specified\n" +
                "Specify one of {dockerizedVersion,cairo1BinDir} in the hardhat config file OR --cairo1-bin-dir in the CLI";
            throw new StarknetPluginError(msg);
        }

        const cairo1Bin = path.join(binDirPath, binCommand);
        return [cairo1Bin, ...args];
    }

    public abstract compileCairoToSierra(options: CairoToSierraOptions): Promise<ProcessResult>;

    public abstract compileSierraToCasm(options: SierraToCasmOptions): Promise<ProcessResult>;
}

export class DockerizedCairoWrapper extends CairoWrapper {
    private formattedImage: string;

    constructor(imageTag: string, private projectRootPath: string) {
        super();
    }

    public async compileCairoToSierra(options: CairoToSierraOptions): Promise<ProcessResult> {
        const args = this.prepareCairoToSierraOptions(options);
        const command = this.getCairo1Command(DOCKER_HOST_BIN_PATH, CAIRO1_COMPILE_BIN, args);
        const externalServer = new DockerCairo1Compiler(this.image, [this.rootPath], command);

        return await externalServer.compileCairo1();
    }

    public async compileSierraToCasm(options: SierraToCasmOptions): Promise<ProcessResult> {
        const args = this.prepareSierraToCasmOptions(options);
        const command = this.getCairo1Command(
            DOCKER_HOST_BIN_PATH,
            CAIRO1_SIERRA_COMPILE_BIN,
            args
        );
        const externalServer = new DockerCairo1Compiler(this.image, [this.rootPath], command);

        return await externalServer.compileCairo1();
    }
}

export class CustomCairoWrapper extends CairoWrapper {
    constructor(private scarbCommand: string) {
        super();

        // validate
        const execution = spawnSync(scarbCommand, ["--version"]);
        // on mac, properties of spawnSync result can be null if invalid command
        if (execution.status !== 0) {
            throw new StarknetPluginError(
                `Not a legal executable Scarb command: ${scarbCommand}.\n${execution.stderr?.toString()}`
            );
        }

        // log
        const versionString = execution.stdout.toString().trim().split("\n").join(", ");
        console.log(`${PLUGIN_NAME} plugin using custom Cairo compiler (${versionString})`);
    }

    public async compileCairoToSierra(options: CairoToSierraOptions): Promise<ProcessResult> {
        const args = this.prepareCairoToSierraOptions(options);
        const command = this.getCairo1Command(options.binDirPath, CAIRO1_COMPILE_BIN, args);

        const executed = exec(command.join(" "));
        return executed;
    }

    public async compileSierraToCasm(options: SierraToCasmOptions): Promise<ProcessResult> {
        const args = this.prepareSierraToCasmOptions(options);
        const command = this.getCairo1Command(options.binDirPath, CAIRO1_SIERRA_COMPILE_BIN, args);

        const executed = exec(command.join(" "));
        return executed;
    }
}
