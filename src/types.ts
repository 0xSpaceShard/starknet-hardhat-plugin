import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "./constants";

export class DockerWrapper {
    private docker: HardhatDocker;
    public image: Image;

    constructor(image: Image) {
        this.image = image;
    }

    public async getDocker() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
            if (!(await this.docker.hasPulledImage(this.image))) {
                console.log(`Pulling image ${this.image.repository}:${this.image.tag}`);
                await this.docker.pullImage(this.image);
            }
        }
        return this.docker;
    }
}

export class StarknetContract {
    private dockerWrapper: DockerWrapper;
    private metadataPath: string;
    private abiPath: string;
    private address: string;
    private gatewayUrl: string;

    constructor(dockerWrapper: DockerWrapper, metadataPath: string, abiPath: string, gatewayUrl: string) {
        this.dockerWrapper = dockerWrapper;
        this.metadataPath = metadataPath;
        this.abiPath = abiPath;
        this.gatewayUrl = gatewayUrl;
    }

    async deploy() {
        const docker = await this.dockerWrapper.getDocker();
        const executed = await docker.runContainer(
            this.dockerWrapper.image,
            [
                "starknet", "deploy",
                "--contract", this.metadataPath,
                "--gateway_url", this.gatewayUrl
            ],
            {
                binds: {
                    [this.metadataPath]: this.metadataPath
                }
            }
        );

        if (executed.statusCode) {
            throw new HardhatPluginError(PLUGIN_NAME, "Could not deploy");
        }
        
        const matched = executed.stdout.toString().match(/^Contract address: (.*)$/m);
        this.address = matched[1];
        if (!this.address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Could not extract the address from the deployment response.");
        }
    }

    private async invokeOrCall(kind: "invoke" | "call", functionName: string, functionArgs: string[] = []) {
        if (!this.address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Contract not deployed");
        }

        const docker = await this.dockerWrapper.getDocker();
        const starknetArgs = [
            "starknet", kind,
            "--address", this.address,
            "--abi", this.abiPath,
            "--function", functionName,
            "--gateway_url", this.gatewayUrl
        ];

        if (functionArgs.length) {
            starknetArgs.push("--inputs");
            functionArgs.forEach(arg => starknetArgs.push(arg.toString()));
        }

        const executed = await docker.runContainer(
            this.dockerWrapper.image,
            starknetArgs,
            {
                binds: {
                    [this.abiPath]: this.abiPath
                }
            }
            );
            
            if (executed.statusCode) {
                // TODO edit err msg (replace strings)
                throw new HardhatPluginError(PLUGIN_NAME, `Could not ${kind} ${functionName}:\n` + executed.stderr.toString());
            }
            
            return executed;
    }

    async checkStatus(txID: string) {
        const docker = await this.dockerWrapper.getDocker();
        const executed = await docker.runContainer(
            this.dockerWrapper.image,
            [
                "starknet", "tx_status",
                "--id", txID,
                "--gateway_url", this.gatewayUrl
            ]
        );

        if (executed.statusCode) {
            throw new HardhatPluginError(PLUGIN_NAME, executed.stderr.toString());
        }

        const response = executed.stdout.toString();
        try {
            const responseParsed = JSON.parse(response);
            return responseParsed.tx_status;
        } catch (err) {
            throw new HardhatPluginError(PLUGIN_NAME, `Cannot interpret the following: ${response}`);
        }
    }

    async iterativelyCheckStatus(txID: string, resolve: () => void) {
        const TIMEOUT = 1000; // ms
        const status = await this.checkStatus(txID);
        if (["PENDING", "ACCEPTED_ONCHAIN"].includes(status)) {
            resolve();
        } else {
            setTimeout(this.iterativelyCheckStatus.bind(this), TIMEOUT, txID, resolve);
        }
    }

    async invoke(functionName: string, functionArgs: string[]): Promise<void> {
        const executed = await this.invokeOrCall("invoke", functionName, functionArgs);

        const matched = executed.stdout.toString().match(/^Transaction ID: (.*)$/m);
        const txID = matched[1];

        return new Promise<void>((resolve) => {
            this.iterativelyCheckStatus(txID, resolve);
        });
    }

    async call(functionName: string, functionArgs: string[]): Promise<string> {
        const executed = await this.invokeOrCall("call", functionName, functionArgs);
        return executed.stdout.toString();
    }
}
