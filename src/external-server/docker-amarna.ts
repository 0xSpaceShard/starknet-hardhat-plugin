import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./docker-server";
import * as fs from "fs";
import { spawnSync } from "child_process";
import { stdout } from "process";

export class AmarnaDocker extends DockerServer {
    useShell = false;
    /**
     * @param image the Docker image to be used for running the container
     * @param cairoPaths the paths specified in hardhat config cairoPaths
     */
    constructor(image: Image, private path: string) {
        super(image, "127.0.0.1", null, "", "amarna-docker");
    }

    protected async getDockerArgs(): Promise<string[]> {
        // To access the files on host machine from inside the container, proper mounting has to be done.
        const volumes = ["-v", `${this.path}:/src`];
        const dockerArgs = [...volumes];
        if (this.useShell) {
            // Run ./amarna.sh file for custom args
            if (fs.existsSync(`${this.path}/amarna.sh`)) {
                dockerArgs.push("--entrypoint", "./amarna.sh");
            } else {
                console.warn(
                    "amarna.sh file not found in the project directory.\n",
                    "Add amarna.sh file with amarna command to run in the container.\n",
                    "Running the container with default amarna script.`"
                );
            }
        }
        return dockerArgs;
    }

    public async run(args: { script?: boolean }) {
        this.useShell = !!args.script;
        const formattedImage = `${this.image.repository}:${this.image.tag}`;
        console.log(`Pulling amarna image ${formattedImage}.`);
        this.spawnSyncOutput("docker", ["pull", formattedImage]);
        const docker_args = [
            "run",
            "--rm",
            "-i",
            "-a",
            "--name",
            this.containerName,
            ...(await this.getDockerArgs()),
            formattedImage,
            ...(await this.getContainerArgs())
        ];
        console.log("Running amarna, this may take a while.");
        this.spawnSyncOutput("docker", docker_args);
    }

    protected spawnSyncOutput(cmd: string, args: string[]) {
        const result = spawnSync(cmd, args, { encoding: "utf-8" });
        console.log(result);
        result.stdout && console.log(result.stdout);
        result.stderr && console.error(result.stderr);
        return result;
    }

    protected async getContainerArgs(): Promise<string[]> {
        return [];
    }
}
