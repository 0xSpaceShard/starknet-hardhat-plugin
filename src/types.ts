import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import * as fs from "fs";
import * as starknet from "./starknet-types";
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
            "--gateway_url", gatewayUrl,
            "--feeder_gateway_url", feederGatewayUrl
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

export class StarknetContractFactory {
    private dockerWrapper: DockerWrapper;
    private abi: starknet.Abi;
    private abiPath: string;
    private metadataPath: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractFactoryConfig) {
        this.dockerWrapper = config.dockerWrapper;
        this.abiPath = config.abiPath;
        const abiRaw = fs.readFileSync(config.abiPath).toString();
        this.abi = JSON.parse(abiRaw);
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
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
    }

    private async invokeOrCall(kind: "invoke" | "call", functionName: string, ...args: any[]) {
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
            "--gateway_url", this.gatewayUrl,
            "--feeder_gateway_url", this.feederGatewayUrl
        ];

        if (args.length) {
            starknetArgs.push("--inputs");
            args.forEach(arg => starknetArgs.push(arg.toString()));
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
     * @param functionName
     * @param functionArgs
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async invoke(functionName: string, ...args: any[]): Promise<void> {
        const executed = await this.invokeOrCall("invoke", functionName, ...args);
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
     * @param functionName
     * @param functionArgs
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async call(functionName: string, ...args: any[]): Promise<any> {
        const executed = await this.invokeOrCall("call", functionName, ...args);
        const func = <starknet.Function> this.abi[functionName];
        const parsedOutput = adaptFunctionResult(executed.stdout.toString(), func.outputs, this.abi);
        return parsedOutput;
    }
}

/**
 * Adapts the string resulting from a Starknet CLI function call.
 * This is done according to the actual output type specifed by the called function.
 * 
 * @param result the actual result, basically an unparsed string
 * @param expectedOutput array of starknet types in the expected function output
 * @param abi the ABI of the contract whose function was called
 */
 export function adaptFunctionResult(rawResult: string, expectedOutput: starknet.Argument[], abi: starknet.Abi): any {
    const splitStr = rawResult.split(" ");
    const result = [];
    for (const num of splitStr) {
        result.push(parseInt(num));
    }

    let resultIndex = 0;
    let lastName: string = null;
    let lastValue: number = null;
    const adapted: any[] = [];

    for (const expectedEntry of expectedOutput) {
        const currentValue = result[resultIndex];
        if (expectedEntry.type === "felt") {
            adapted.push(currentValue);
            resultIndex++;
        }

        else if (expectedEntry.type === "felt*") {
            if (lastName !== `${expectedEntry.name}_len`) {
                const msg = `Array size argument ${lastName} must appear right before`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            const arrLength = lastValue;
            const arr = result.slice(resultIndex, resultIndex + arrLength);
            adapted[adapted.length-1] = arr;
            resultIndex += arrLength;
        }

        else {
            const ret = generateComplex(result, resultIndex, expectedEntry.type, abi);
            adapted.push(ret.generatedComplex);
            resultIndex = ret.newRawIndex;
        }

        lastName = expectedEntry.name;
        lastValue = currentValue;
    }
}

// TODO comment
function generateComplex(raw: any[], rawIndex: number, type: string, abi: starknet.Abi) {
    if (type === "felt") {
        return {
            generatedComplex: <number> raw[rawIndex],
            newRawIndex: rawIndex + 1
        }
    }

    let generatedComplex: any = null;
    let members: string[] = null;
    if (type[0] === "(" && type[type.length-1] === ")") {
        members = type.slice(1, -1).split(", ");

        generatedComplex = [];
        for (const member of members) {
            const ret = generateComplex(raw, rawIndex, member, abi);
            generatedComplex.push(ret.generatedComplex);
            rawIndex = ret.newRawIndex;
        }

    } else {// struct
        if (!(type in abi)) {
            throw new HardhatPluginError(PLUGIN_NAME, `Type ${type} not present in ABI`);
        }

        generatedComplex = {};
        const struct = <starknet.Struct> abi[type]
        for (const member of struct.members) {
            const ret = generateComplex(raw, rawIndex, member.type, abi);
            generatedComplex[member.name] = ret.generatedComplex;
            rawIndex = ret.newRawIndex;
        }
    }

    return {
        generatedComplex,
        newRawIndex: rawIndex
    };
}
