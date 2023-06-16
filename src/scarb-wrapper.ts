import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { StarknetPluginError } from "./starknet-plugin-error";
import { CAIRO_CLI_DOCKER_REPOSITORY, PLUGIN_NAME } from "./constants";
import { getImageTagByArch } from "./utils";
import path from "path";
import os from "os";

export abstract class ScarbWrapper {
    private static instance: ScarbWrapper;

    static getInstance(cliArgs: TaskArguments, hre: HardhatRuntimeEnvironment): ScarbWrapper {
        if (this.instance) {
            return this.instance;
        } else if (cliArgs.scarbPath) {
            this.instance = new CustomScarbWrapper(cliArgs.scarbPath);
        } else if (hre.config.starknet.scarbPath) {
            this.instance = new CustomScarbWrapper(hre.config.starknet.scarbPath);
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

        const repository = CAIRO_CLI_DOCKER_REPOSITORY;
        const tag = getImageTagByArch(imageTag);
        this.formattedImage = `${repository}:${tag}`;

        // log
        console.log(`${PLUGIN_NAME} plugin using dockerized Scarb`);
    }

    public override build(packageConfigPath: string, artifactDirPath: string): ProcessResult {
        const packageDir = path.dirname(packageConfigPath);

        // the default path used by scarb, if not specified, inside the container it tries to write to /.cache
        // which is not allowed for a non-root user
        const globalCacheDir = path.join(os.homedir(), ".cache", "scarb");
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
