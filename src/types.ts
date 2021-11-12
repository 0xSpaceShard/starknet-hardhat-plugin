import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import * as fs from "fs";
import * as starknet from "./starknet-types";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, CHECK_STATUS_TIMEOUT } from "./constants";
import { adaptLog, adaptUrl } from "./utils";
import { adaptInput, adaptOutput } from "./adapt";

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

function extractFromResponse(response: string, regex: RegExp) {
    const matched = response.match(regex);
    if (!matched || !matched[1]) {
        throw new HardhatPluginError(PLUGIN_NAME, "Could not parse response. Check that you're using the correct network.");
    }
    return matched[1];
}

function extractTxHash(response: string) {
    return extractFromResponse(response, /^Transaction hash: (.*)$/m);
}

function extractAddress(response: string) {
    return extractFromResponse(response, /^Contract address: (.*)$/m);
}

async function checkStatus(txHash: string, dockerWrapper: DockerWrapper, gatewayUrl: string, feederGatewayUrl: string) {
    const docker = await dockerWrapper.getDocker();
    const executed = await docker.runContainer(
        dockerWrapper.image,
        [
            "starknet", "tx_status",
            "--hash", txHash,
            "--gateway_url", adaptUrl(gatewayUrl),
            "--feeder_gateway_url", adaptUrl(feederGatewayUrl)
        ],
        {
            networkMode: "host"
        }
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

async function iterativelyCheckStatus(
    txHash: string,
    dockerWrapper: DockerWrapper,
    gatewayUrl: string,
    feederGatewayUrl: string,
    resolve: () => void,
    reject: (reason?: any) => void
) {
    const timeout = CHECK_STATUS_TIMEOUT; // ms
    const status = await checkStatus(txHash, dockerWrapper, gatewayUrl, feederGatewayUrl);
    if (["PENDING", "ACCEPTED_ONCHAIN"].includes(status)) {
        resolve();
    } else if (["REJECTED"].includes(status)) {
        reject(new Error("Transaction rejected."));
    } else {
        // Make a recursive call, but with a delay.
        // Local var `arguments` holds what was passed in the current call
        setTimeout(iterativelyCheckStatus, timeout, ...arguments);
    }
}

function readAbi(abiPath: string): starknet.Abi {
    const abiRaw = fs.readFileSync(abiPath).toString();
    const abiArray = JSON.parse(abiRaw);
    const abi: starknet.Abi = {};
    for (const abiEntry of abiArray) {
        if (!abiEntry.name) {
            const msg = `Abi entry has no name: ${abiEntry}`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
        abi[abiEntry.name] = abiEntry;
    }

    return abi;
}

export class StarknetContractFactory {
    private dockerWrapper: DockerWrapper;
    private abi: starknet.Abi;
    private abiPath: string;
    private constructorAbi: starknet.Function;
    private metadataPath: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractFactoryConfig) {
        this.dockerWrapper = config.dockerWrapper;
        this.abiPath = config.abiPath;
        this.abi = readAbi(this.abiPath);
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
        this.metadataPath = config.metadataPath;

        // find constructor
        for (const abiEntryName in this.abi) {
            const abiEntry = this.abi[abiEntryName];
            if (abiEntry.type === "constructor") {
                this.constructorAbi = <starknet.Function> abiEntry;
            }
        }
    }

    /**
     * Deploy a contract instance to a new address.
     * Optionally pass constructor arguments.
     *
     * E.g. if there is a function
     * ```text
     * @constructor
     * func constructor{
     *     syscall_ptr : felt*,
     *     pedersen_ptr : HashBuiltin*,
     *     range_check_ptr
     * } (initial_balance : felt):
     *     balance.write(initial_balance)
     *     return ()
     * end
     * ```
     * this plugin allows you to call it like:
     * ```
     * const contractFactory = ...;
     * const instance = await contractFactory.deploy({ initial_balance: 100 });
     * ```
     * @param constructorArguments constructor arguments
     * @returns the newly created instance
     */
    async deploy(constructorArguments?: any): Promise<StarknetContract> {
        const docker = await this.dockerWrapper.getDocker();

        const starknetArgs = [
            "starknet", "deploy",
            "--contract", this.metadataPath,
            "--gateway_url", adaptUrl(this.gatewayUrl)
        ];

        if (this.constructorAbi) {
            if (!constructorArguments || Object.keys(constructorArguments).length === 0) {
                throw new HardhatPluginError(PLUGIN_NAME, "Constructor arguments required but not provided.");
            }
            const construtorArguments = adaptInput(
                this.constructorAbi.name, constructorArguments, this.constructorAbi.inputs, this.abi
            );
            starknetArgs.push("--inputs");
            construtorArguments.forEach(arg => starknetArgs.push(arg));
        }

        if (constructorArguments && Object.keys(constructorArguments).length) {
            if (!this.constructorAbi) {
                throw new HardhatPluginError(PLUGIN_NAME, "Constructor arguments provided but not required.");
            }
            // other case already handled
        }

        const executed = await docker.runContainer(
            this.dockerWrapper.image,
            starknetArgs,
            {
                binds: {
                    [this.metadataPath]: this.metadataPath
                },
                networkMode: "host"
            }
        );

        if (executed.statusCode) {
            const msg = "Could not deploy contract. Check the network url in config. Is it responsive?";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const executedOutput = executed.stdout.toString();
        const address = extractAddress(executedOutput);
        const txHash = extractTxHash(executedOutput);

        const contract = new StarknetContract({
            abiPath: this.abiPath,
            dockerWrapper: this.dockerWrapper,
            feederGatewayUrl: this.feederGatewayUrl,
            gatewayUrl: this.gatewayUrl
        });
        contract.address = address;

        return new Promise<StarknetContract>((resolve, reject) => {
            iterativelyCheckStatus(
                txHash,
                this.dockerWrapper,
                this.gatewayUrl,
                this.feederGatewayUrl,
                () => resolve(contract),
                reject
            );
        });
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
    private abi: starknet.Abi;
    private abiPath: string;
    public address: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractConfig) {
        this.dockerWrapper = config.dockerWrapper;
        this.abiPath = config.abiPath;
        this.abi = readAbi(this.abiPath);
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
    }

    private async invokeOrCall(kind: "invoke" | "call", functionName: string, args: any) {
        if (!this.address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Contract not deployed");
        }

        const func = <starknet.Function> this.abi[functionName];
        if (!func) {
            const msg = `Function '${functionName}' doesn't exist on this contract.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const docker = await this.dockerWrapper.getDocker();
        const starknetArgs = [
            "starknet", kind,
            "--address", this.address,
            "--abi", this.abiPath,
            "--function", functionName,
            "--gateway_url", adaptUrl(this.gatewayUrl),
            "--feeder_gateway_url", adaptUrl(this.feederGatewayUrl)
        ];

        if (args && Object.keys(args).length) {
            starknetArgs.push("--inputs");
            const adapted = adaptInput(functionName, args, func.inputs, this.abi);
            starknetArgs.push(...adapted);
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

    /**
     * Invoke the function by name and optionally provide arguments in an array.
     * For a usage example @see {@link call}
     * @param functionName
     * @param args
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async invoke(functionName: string, args?: any): Promise<void> {
        const executed = await this.invokeOrCall("invoke", functionName, args);
        const txHash = extractTxHash(executed.stdout.toString());

        return new Promise<void>((resolve, reject) => {
            iterativelyCheckStatus(
                txHash,
                this.dockerWrapper,
                this.gatewayUrl,
                this.feederGatewayUrl,
                resolve,
                reject
            );
        });
    }

    /**
     * Call the function by name and optionally provide arguments in an array.
     *
     * E.g. If your contract has a function
     * ```text
     * func double_sum(x: felt, y: felt) -> (res: felt):
     *     return (res=(x + y) * 2)
     * end
     * ```
     * then you would call it like:
     * ```typescript
     * const contract = ...;
     * const { res: sum } = await contract.call("double_sum", { x: 2, y: 3 });
     * console.log(sum);
     * ```
     * which would result in:
     * ```
     * > 10
     * ```
     * @param functionName
     * @param args
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async call(functionName: string, args?: any): Promise<any> {
        const executed = await this.invokeOrCall("call", functionName, args);
        const func = <starknet.Function> this.abi[functionName];
        const adaptedOutput = adaptOutput(executed.stdout.toString(), func.outputs, this.abi);
        return adaptedOutput;
    }
}
