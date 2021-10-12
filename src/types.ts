import { default as Docker, ContainerCreateOptions } from "dockerode";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, CHECK_STATUS_TIMEOUT } from "./constants";
import { adaptLog } from "./utils";
import * as fs from "fs";
import { generateWritableStreams } from "./streams";
import { IncomingMessage } from "http";

interface Image {
    repository: string;
    tag: string;
}

function imageToString(image: Image) {
    return `${image.repository}:${image.tag}`;
}

function imageToRepositoryPath(image: Image): string {
    return image.repository.includes("/")
      ? image.repository
      : `library/${image.repository}`;
  }

function validateBindsMap(map?: BindsMap) {
    if (map === undefined) {
        return;
    }

    for (const hostPath of Object.keys(map)) {
        if (!(fs.existsSync(hostPath))) {
            throw new HardhatPluginError(PLUGIN_NAME, `Path doesn't exist: ${hostPath}`);
        }
    }
}

function bindsMapToArray(map?: BindsMap) {
    if (map === undefined) {
        return [];
    }
    validateBindsMap(map);

    return Object.entries(map).map(
        ([host, container]) => `${host}:${container}`
    );
}

export function generateDockerHostOptions(config: {
    workingDirectory?: string,
    binds?: { [hostPath: string]: string },
} = {}): ContainerCreateOptions {
    return {
        Tty: false,
        WorkingDir: config.workingDirectory,
        Entrypoint: "",
        HostConfig: {
          AutoRemove: true,
          Binds: bindsMapToArray(config.binds),
        },
    };
}

interface BindsMap {
    [hostPath: string]: string;
}

export interface ProcessResult {
    statusCode: number,
    stdout: Buffer,
    stderr: Buffer,
}

export class DockerWrapper {
    private docker: Docker;
    public image: Image;
    public imageStringified: string;

    constructor(image: Image) {
        this.image = image;
        this.imageStringified = imageToString(image);
    }

    public async getDocker() {
        if (!this.docker) {
            this.docker = new Docker();
            if (!(await this.hasPulledImage())) {
                await this.pullImage();
            }
        }
        return this.docker;
    }

    private async hasPulledImage(): Promise<boolean> {
        const images = await this.docker.listImages();

        return images.some(
          (img) =>
            img.RepoTags !== null &&
            img.RepoTags.some(
                (repoAndTag: string) => repoAndTag === this.imageStringified
            )
        );
    }

    private async pullImage(): Promise<void> {
        if (!(await this.imageExists())) {
             throw new HardhatPluginError(PLUGIN_NAME, `Image doesn't exist: ${this.imageStringified}`);
        }

        console.log(`Pulling image ${this.imageStringified}`);
        const im: IncomingMessage = await this.docker.pull(
            this.imageStringified, {}
        );

        return new Promise((resolve, reject) => {
            im.on("end", resolve);
            im.on("error", reject);

            // Not having the data handler causes the process to exit
            im.on("data", () => {});
        });
    }

    public async imageExists(): Promise<boolean> {
        const repositoryPath = imageToRepositoryPath(this.image);
        const tag = this.image.tag;
        const imageEndpoint = `https://registry.hub.docker.com/v2/repositories/${repositoryPath}/tags/${tag}/`;

        try {
            const fetch = require("node-fetch");
            const res = await fetch(imageEndpoint);

            // Consume the response stream and discard its result
            // See: https://github.com/node-fetch/node-fetch/issues/83
            const _discarded = await res.text();

            return res.ok;
        } catch (error: any) {
            throw new HardhatPluginError(PLUGIN_NAME, error.message);
        }
    }
}

export type StarknetContractFactoryConfig = StarknetContractConfig & {
    metadataPath: string;
};

export interface StarknetContractConfig {
    dockerWrapper: DockerWrapper;
    abiPath: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
}

export class StarknetContractFactory {
    private dockerWrapper: DockerWrapper;
    private abiPath: string;
    private metadataPath: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractFactoryConfig) {
        this.dockerWrapper = config.dockerWrapper;
        this.abiPath = config.abiPath;
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
        this.metadataPath = config.metadataPath;
    }

    /**
     * Deploy a contract instance to a new address.
     * @returns the newly created instance
     */
     async deploy(): Promise<StarknetContract> {
        const docker = await this.dockerWrapper.getDocker();
        const streams = generateWritableStreams();
        const executed = await docker.run(
            this.dockerWrapper.imageStringified,
            [
                "starknet", "deploy",
                "--contract", this.metadataPath,
                "--gateway_url", this.gatewayUrl
            ],
            [streams.stdout, streams.stderr],
            generateDockerHostOptions({
                binds: {
                    [this.metadataPath]: this.metadataPath
                }
            })
        );

        if (executed[0].StatusCode) {
            const msg = "Could not deploy contract. Check the network url in config and if it's responsive.";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const matched = streams.stdout.buffer.toString().match(/^Contract address: (.*)$/m);
        const address = matched[1];
        if (!address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Could not extract the address from the deployment response.");
        }

        const contract = new StarknetContract({
            abiPath: this.abiPath,
            dockerWrapper: this.dockerWrapper,
            feederGatewayUrl: this.feederGatewayUrl,
            gatewayUrl: this.gatewayUrl
        });
        contract.address = address;
        return contract;
    }

    /**
     * Returns a contract instance with set address.
     * No address validity checks are performed.
     * @param address the address of a previously deployed contract
     * @returns a contract instance
     */
    getContractAt(address: string) {
        const contract = new StarknetContract({
            abiPath: this.abiPath,
            dockerWrapper: this.dockerWrapper,
            feederGatewayUrl: this.feederGatewayUrl,
            gatewayUrl: this.gatewayUrl
        });
        contract.address = address;
        return contract;
    }
}

export class StarknetContract {
    private dockerWrapper: DockerWrapper;
    private abiPath: string;
    public address: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractConfig) {
        this.dockerWrapper = config.dockerWrapper;
        this.abiPath = config.abiPath;
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
    }

    private async invokeOrCall(
        kind: "invoke" | "call",
        functionName: string,
        functionArgs: string[] = []
    ): Promise<ProcessResult> {
        if (!this.address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Contract not deployed");
        }

        const docker = await this.dockerWrapper.getDocker();
        const starknetArgs = [
            "starknet", kind,
            "--address", this.address,
            "--abi", this.abiPath,
            "--function", functionName,
            "--gateway_url", this.gatewayUrl,
            "--feeder_gateway_url", this.feederGatewayUrl
        ];

        if (functionArgs.length) {
            starknetArgs.push("--inputs");
            functionArgs.forEach(arg => starknetArgs.push(arg.toString())); // TODO why is this toString?
        }

        const streams = generateWritableStreams();

        const executed = await docker.run(
            this.dockerWrapper.imageStringified,
            starknetArgs,
            [streams.stdout, streams.stderr],
            generateDockerHostOptions({
                binds: {
                    [this.abiPath]: this.abiPath
                }
            })
        );

        const statusCode = executed[0].StatusCode;
        if (statusCode) {
            const msg = `Could not ${kind} ${functionName}:\n` + streams.stderr.buffer.toString();
            const replacedMsg = adaptLog(msg);
            throw new HardhatPluginError(PLUGIN_NAME, replacedMsg);
        }

        return {
            statusCode: statusCode,
            stdout: streams.stdout.buffer,
            stderr: streams.stderr.buffer
        };
    }

    private async checkStatus(txID: string) {
        const docker = await this.dockerWrapper.getDocker();
        const streams = generateWritableStreams();
        const executed = await docker.run(
            this.dockerWrapper.imageStringified,
            [
                "starknet", "tx_status",
                "--id", txID,
                "--gateway_url", this.gatewayUrl,
                "--feeder_gateway_url", this.feederGatewayUrl
            ],
            [streams.stdout, streams.stderr],
            generateDockerHostOptions()
        );

        if (executed[0].StatusCode) {
            throw new HardhatPluginError(PLUGIN_NAME, streams.stderr.buffer.toString());
        }

        const response = streams.stdout.buffer.toString();
        try {
            const responseParsed = JSON.parse(response);
            return responseParsed.tx_status;
        } catch (err) {
            throw new HardhatPluginError(PLUGIN_NAME, `Cannot interpret the following: ${response}`);
        }
    }

    private async iterativelyCheckStatus(txID: string, resolve: () => void) {
        const timeout = CHECK_STATUS_TIMEOUT; // ms
        const status = await this.checkStatus(txID);
        if (["PENDING", "ACCEPTED_ONCHAIN"].includes(status)) {
            resolve();
        } else {
            setTimeout(this.iterativelyCheckStatus.bind(this), timeout, txID, resolve);
        }
    }

    /**
     * Invoke the function by name and optionally provide arguments in an array.
     * @param functionName
     * @param functionArgs
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async invoke(functionName: string, functionArgs: any[] = []): Promise<void> {
        const executed = await this.invokeOrCall("invoke", functionName, functionArgs);

        const matched = executed.stdout.toString().match(/^Transaction ID: (.*)$/m);
        const txID = matched[1];

        return new Promise<void>((resolve) => {
            this.iterativelyCheckStatus(txID, resolve);
        });
    }

    /**
     * Call the function by name and optionally provide arguments in an array.
     * @param functionName
     * @param functionArgs
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async call(functionName: string, functionArgs: any[] = []): Promise<string> {
        const executed = await this.invokeOrCall("call", functionName, functionArgs);
        return executed.stdout.toString();
    }
}
