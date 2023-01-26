import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import * as fs from "fs";

export class AmarnaDocker {
    useShell = false;
    container: string;
    docker: HardhatDocker;
    /**
     * @param image the Docker image to be used for running the container
     * @param cairoPaths the paths specified in hardhat config cairoPaths
     */
    constructor(private image: Image, private path: string) {
        this.container = "amarna-container-" + Math.random();
    }

    protected getDockerArgs(): string[] {
        let cmd = ["amarna", ".", "-o", "out.sarif"];
        if (this.useShell) {
            // Run ./amarna.sh file for custom args
            if (fs.existsSync(`${this.path}/amarna.sh`)) {
                cmd = ["./amarna.sh"];
            } else {
                console.warn(
                    "amarna.sh file not found in the project directory.\n",
                    "Add amarna.sh file with amarna command to run in the container.\n",
                    "Running the container with default amarna script.`"
                );
            }
        }
        return cmd;
    }

    public async run(args: { script?: boolean }) {
        const { path } = this;
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
        }
        this.useShell = !!args.script;
        const formattedImage = `${this.image.repository}:${this.image.tag}`;
        if (!this.docker.hasPulledImage(this.image)) {
            console.log(`Pulling amarna image ${formattedImage}.`);
            await this.docker.pullImage(this.image);
        }
        const cmd = this.getDockerArgs();

        console.log("Running amarna, this may take a while.");
        const { stdout, stderr } = await this.docker.runContainer(this.image, cmd, {
            binds: {
                [path]: "/src"
            }
        });
        // Output the output/error for user to review.
        console.log(stdout.toString(), stderr.toString());
    }
}
