import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import { TaskArguments } from "hardhat/types";
import { StarknetConfig } from "./types/starknet";
import { StarknetPluginError } from "./starknet-plugin-error";
import { PLUGIN_NAME } from "./constants";

export abstract class ScarbWrapper {
    private static instance: ScarbWrapper;

    static getInstance(cliArgs: TaskArguments, config: StarknetConfig): ScarbWrapper {
        if (this.instance) {
            return this.instance;
        } else if (cliArgs.scarbPath) {
            this.instance = new CustomScarbWrapper(cliArgs.scarbPath);
        } else if (config.scarbPath) {
            this.instance = new CustomScarbWrapper(config.scarbPath);
        } else {
            this.instance = new DockerizedScarbWrapper();
        }
        return this.instance;
    }

    public abstract build(packageConfigPath: string, artifactDirPath: string): ProcessResult;
}

export class DockerizedScarbWrapper extends ScarbWrapper {
    public override build(packageConfigPath: string, artifactDirPath: string): ProcessResult {
        throw new Error("Method not implemented.");
    }
}

export class CustomScarbWrapper extends ScarbWrapper {
    constructor(private scarbPath: string) {
        super();

        // validate
        const execution = spawnSync(scarbPath, ["--version"]);
        if (execution.status) {
            throw new StarknetPluginError(
                `Not a legal executable Scarb Path: ${scarbPath}.\n${execution.stderr.toString()}`
            );
        }

        // log
        const versionString = execution.stdout.toString().trim().split("\n").join(", ");
        console.log(`${PLUGIN_NAME} plugin using custom Scarb (${versionString})`);
    }

    public override build(packageConfigPath: string, artifactDirPath: string): ProcessResult {
        const execution = spawnSync(this.scarbPath, [
            ...["--manifest-path", packageConfigPath],
            ...["--target-dir", artifactDirPath],
            "build"
        ]);
        return {
            statusCode: execution.status,
            stderr: execution.stderr,
            stdout: execution.stdout
        };
    }
}
