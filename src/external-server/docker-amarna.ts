import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { spawnSync } from "child_process";
import * as fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const DEFAULT_OUTPUT = "out.sarif";

export class AmarnaDocker {
    useShell = false;
    container: string;
    docker: HardhatDocker;

    /**
     * @param image the Docker image to be used for running the container
     * @param cairoPaths the paths specified in hardhat config cairoPaths
     */
    constructor(
        private image: Image,
        private rootPath: string,
        private cairoPaths: string[],
        private hre: HardhatRuntimeEnvironment
    ) {
        this.container = "amarna-container-" + Math.random().toString().slice(2);
    }

    protected getCommand(): string[] {
        let cmd = ["amarna", ".", "-o", DEFAULT_OUTPUT];

        if (this.useShell) {
            // Run ./amarna.sh file for custom args
            if (fs.existsSync(`${this.rootPath}/amarna.sh`)) {
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

    cairoPathBindings(binds: { [x: string]: string }, dockerArgs: string[]) {
        const { cairoPaths } = this;
        if (cairoPaths.length) {
            const cairoPathsEnv: string[] = [];
            cairoPaths.forEach((path, i) => {
                const cPath = `/src/cairo-paths-${i}`;
                binds[path] = cPath;
                cairoPathsEnv.push(cPath);
            });

            dockerArgs.push("--env");
            dockerArgs.push(`CAIRO_PATH=${cairoPathsEnv.join(":")}`);
        }
    }

    private async ensureDockerImage(formattedImage: string): Promise<void> {
        if (!(await this.docker.hasPulledImage(this.image))) {
            console.log(`Pulling amarna image ${formattedImage}.`);
            await this.docker.pullImage(this.image);
        }
    }

    private async prepareDockerArgs(): Promise<string[]> {
        const { rootPath, container } = this;
        const formattedImage = `${this.image.repository}:${this.image.tag}`;
        const binds = {
            [rootPath]: "/src"
        };

        const cmd = this.getCommand();

        const dockerArgs = ["--rm", "-i", "--name", container];

        this.cairoPathBindings(binds, dockerArgs);

        Object.keys(binds).forEach((k) => {
            dockerArgs.push("-v");
            dockerArgs.push(`${k}:${binds[k]}`);
        });

        const entrypoint = cmd.shift();

        await this.ensureDockerImage(formattedImage);

        return [...dockerArgs, "--entrypoint", entrypoint, formattedImage, ...cmd];
    }

    public async run(args: { script?: boolean }) {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
        }

        this.useShell = !!args.script;

        const dockerArgs = await this.prepareDockerArgs();

        console.log("Running amarna, this may take a while.");

        const result = spawnSync("docker", ["run", ...dockerArgs]);

        const defaultOutput = ` at ${this.rootPath}/${DEFAULT_OUTPUT}`;
        console.log(`Sarif file generated${this.useShell ? "" : defaultOutput}`);

        // Output the output/error for user to review.
        result.stdout && console.log(result.stdout.toString());
        result.stderr && console.error(result.stderr.toString());
    }
}
