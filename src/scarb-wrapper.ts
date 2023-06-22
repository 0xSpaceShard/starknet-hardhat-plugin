import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { StarknetPluginError } from "./starknet-plugin-error";
import { PLUGIN_NAME } from "./constants";
import path from "path";
import os from "os";

export abstract class ScarbWrapper {
    private static instance: ScarbWrapper;

    static getInstance(cliArgs: TaskArguments, hre: HardhatRuntimeEnvironment): ScarbWrapper {
        if (this.instance) {
            return this.instance;
        } else if (cliArgs.scarbCommand) {
            this.instance = new CustomScarbWrapper(cliArgs.scarbCommand);
        } else if (hre.config.starknet.scarbCommand) {
            this.instance = new CustomScarbWrapper(hre.config.starknet.scarbCommand);
        } else {
            this.instance = new DockerizedScarbWrapper(
                hre.config.starknet.dockerizedVersion,
                hre.config.paths.root
            );
        }
        return this.instance;
    }

    public abstract build(packageConfigPath: string, artifactDirPath: string): ProcessResult;
}

export class DockerizedScarbWrapper extends ScarbWrapper {
    private formattedImage: string;

    constructor(imageTag: string, private projectRootPath: string) {
        super();

        throw new StarknetPluginError(
            "Dockerized Scarb is not yet supported. " +
                "If you have Scarb installed on your machine, provide its path via scarbCommand in hardhat config, " +
                "or via --scarb-command of hardhat starknet-build"
        );
        // UNCOMMENT THIS WHEN DOCKERIZED SCARB SUPPORTED
        // const repository = CAIRO_CLI_DOCKER_REPOSITORY;
        // const tag = getCairoCliImageTagByArch(imageTag);
        // this.formattedImage = `${repository}:${tag}`;

        // console.log(`${PLUGIN_NAME} plugin using dockerized Scarb (${this.formattedImage})`);
    }

    public override build(packageConfigPath: string, artifactDirPath: string): ProcessResult {
        const packageDir = path.dirname(packageConfigPath);

        // If not specified, inside the container it tries to write cache to /.cache
        // which is not allowed for a non-root user. So here we are setting it to the path used by Scarb
        // in many non-docker environments
        const globalCacheDir = path.join(os.tmpdir(), ".cache", "scarb");
        const execution = spawnSync("docker", [
            "run",
            "--rm",
            ...["-v", `${packageDir}:${packageDir}`],
            ...["-v", `${this.projectRootPath}:${this.projectRootPath}`],
            ...["-v", `${globalCacheDir}:${globalCacheDir}`],

            // https://unix.stackexchange.com/questions/627027/files-created-by-docker-container-are-owned-by-root
            ...["-u", `${os.userInfo().uid}:${os.userInfo().gid}`],

            this.formattedImage,
            "scarb",
            ...["--manifest-path", packageConfigPath],
            ...["--target-dir", artifactDirPath],
            ...["--global-cache-dir", globalCacheDir],
            "build"
        ]);

        return {
            statusCode: execution.status,
            stdout: execution.stdout,
            stderr: execution.stderr
        };
    }
}

export class CustomScarbWrapper extends ScarbWrapper {
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
        console.log(`${PLUGIN_NAME} plugin using custom Scarb (${versionString})`);
    }

    public override build(packageConfigPath: string, artifactDirPath: string): ProcessResult {
        const execution = spawnSync(this.scarbCommand, [
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
