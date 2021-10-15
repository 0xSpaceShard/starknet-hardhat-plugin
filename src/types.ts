import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, CHECK_STATUS_TIMEOUT } from "./constants";
import { adaptLog } from "./utils";

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
                },
                networkMode: "host"
            }
        );

        if (executed.statusCode) {
            const msg = "Could not deploy contract. Check the network url in config and if it's responsive.";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const matched = executed.stdout.toString().match(/^Contract address: (.*)$/m);
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
     * @returns the contract instance at the provided address
     */
    getContractAt(address: string) {
        if (!address) {
            throw new HardhatPluginError(PLUGIN_NAME, "No address provided");
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
            "--gateway_url", this.gatewayUrl,
            "--feeder_gateway_url", this.feederGatewayUrl
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
                },
                networkMode: "host"
            }
            );
            
            if (executed.statusCode) {
                const msg = `Could not ${kind} ${functionName}:\n` + executed.stderr.toString();
                const replacedMsg = adaptLog(msg);
                throw new HardhatPluginError(PLUGIN_NAME, replacedMsg);
            }
            
            return executed;
    }

    private async checkStatus(txID: string) {
        const docker = await this.dockerWrapper.getDocker();
        const executed = await docker.runContainer(
            this.dockerWrapper.image,
            [
                "starknet", "tx_status",
                "--id", txID,
                "--gateway_url", this.gatewayUrl,
                "--feeder_gateway_url", this.feederGatewayUrl
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
