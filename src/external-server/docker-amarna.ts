import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./docker-server";
import * as fs from "fs";

    useShell = false;
    /**
     * @param image the Docker image to be used for running the container
     * @param cairoPaths the paths specified in hardhat config cairoPaths
     */
    constructor(image: Image, private path: string) {
        super(image, "127.0.0.1", null, "", "starknet-docker-proxy");
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
                console.log(
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
        await this.spawnChildProcess();
    }

    protected async getContainerArgs(): Promise<string[]> {
        return [""];
    }
}
