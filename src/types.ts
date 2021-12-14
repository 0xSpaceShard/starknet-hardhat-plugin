import * as fs from "fs";
import * as starknet from "./starknet-types";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, CHECK_STATUS_TIMEOUT } from "./constants";
import { adaptLog } from "./utils";
import { adaptInput, adaptOutput } from "./adapt";
import { StarknetWrapper } from "./starknet-wrappers";

/**
 * According to: https://starknet.io/docs/hello_starknet/intro.html#interact-with-the-contract
 * Not using an enum to avoid code duplication and reverse mapping.
 */
export type TxStatus =
    /** The transaction passed the validation and entered the pending block. */
    "PENDING"

    /** The transaction has not been received yet (i.e., not written to storage). */
    | "NOT_RECEIVED"

    /** The transaction was received by the operator. */
    | "RECEIVED"

    /** The transaction failed validation and thus was skipped. */
    | "REJECTED"

    /** The transaction passed the validation and entered an actual created block. */
    | "ACCEPTED_ON_L2"

    /** The transaction was accepted on-chain. */
    | "ACCEPTED_ON_L1"
;

export type StarknetContractFactoryConfig = StarknetContractConfig & {
    metadataPath: string;
}

export interface StarknetContractConfig {
    starknetWrapper: StarknetWrapper;
    abiPath: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
}

export type Numeric = number | bigint;

/**
 * Object whose keys are strings (names) and values are any object.
 */
export interface StringMap {
    [key: string]: any;
}

export type Choice = "call" | "invoke";

function extractFromResponse(response: string, regex: RegExp) {
    const matched = response.match(regex);
    if (!matched || !matched[1]) {
        throw new HardhatPluginError(PLUGIN_NAME, "Could not parse response. Check that you're using the correct network.");
    }
    return matched[1];
}

export function extractTxHash(response: string) {
    return extractFromResponse(response, /^Transaction hash: (.*)$/m);
}

function extractAddress(response: string) {
    return extractFromResponse(response, /^Contract address: (.*)$/m);
}

/**
 * The object returned by starknet tx_status.
 */
 type StatusObject = {
    block_hash: string,
    tx_status: TxStatus
}

async function checkStatus(hash: string, starknetWrapper: StarknetWrapper, gatewayUrl: string, feederGatewayUrl: string): Promise<StatusObject> {
    const executed = await starknetWrapper.getTxStatus({
        hash,
        gatewayUrl,
        feederGatewayUrl
    });
    if (executed.statusCode) {
        throw new HardhatPluginError(PLUGIN_NAME, executed.stderr.toString());
    }

    const response = executed.stdout.toString();
    try {
        const responseParsed = JSON.parse(response);
        return responseParsed;
    } catch (err) {
        throw new HardhatPluginError(PLUGIN_NAME, `Cannot interpret the following: ${response}`);
    }
}

const ACCEPTABLE_STATUSES: TxStatus[] = ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"];
export function isTxAccepted(statusObject: StatusObject): boolean {
    return ACCEPTABLE_STATUSES.includes(statusObject.tx_status);
}

const UNACCEPTABLE_STATUSES: TxStatus[] = ["REJECTED"];
function isTxRejected(statusObject: StatusObject): boolean {
    return UNACCEPTABLE_STATUSES.includes(statusObject.tx_status);
}

export async function iterativelyCheckStatus(
    txHash: string,
    starknetWrapper: StarknetWrapper,
    gatewayUrl: string,
    feederGatewayUrl: string,
    resolve: (status: string) => void,
    reject: (reason?: any) => void
) {
    const statusObject = await checkStatus(txHash, starknetWrapper, gatewayUrl, feederGatewayUrl);
    if (isTxAccepted(statusObject)) {
        resolve(statusObject.tx_status);
    } else if (isTxRejected(statusObject)) {
        reject(new Error("Transaction rejected."));
    } else {
        // Make a recursive call, but with a delay.
        // Local var `arguments` holds what was passed in the current call
        const timeout = CHECK_STATUS_TIMEOUT; // ms

        setTimeout(iterativelyCheckStatus, timeout, ...arguments);
    }
}

/**
 * Reads ABI from `abiPath` and converts it to an object for lookup by name.
 * @param abiPath the path where ABI is stored on disk
 * @returns an object mapping ABI entry names with their values
 */
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

/**
 * Add `signature` elements to to `starknetArgs`, if there are any.
 * @param signature array of transaction signature elements
 * @param starknetArgs destination array
 */
function handleSignature(signature: Array<Numeric>): string[] {
    if (signature) {
        return signature.map(s => s.toString());
    }
    return [];
}

export class StarknetContractFactory {
    private starknetWrapper: StarknetWrapper;
    private abi: starknet.Abi;
    private abiPath: string;
    private constructorAbi: starknet.Function;
    private metadataPath: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractFactoryConfig) {
        this.starknetWrapper = config.starknetWrapper;
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
    async deploy(constructorArguments?: StringMap, signature?: Array<Numeric>): Promise<StarknetContract> {
        const executed = await this.starknetWrapper.deploy({
            contract: this.metadataPath,
            inputs: this.handleConstructorArguments(constructorArguments),
            signature: handleSignature(signature),
            gatewayUrl: this.gatewayUrl,
        });
        if (executed.statusCode) {
            const msg = "Could not deploy contract. Check the network url in config. Is it responsive?";
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const executedOutput = executed.stdout.toString();
        const address = extractAddress(executedOutput);
        const txHash = extractTxHash(executedOutput);

        const contract = new StarknetContract({
            abiPath: this.abiPath,
            starknetWrapper: this.starknetWrapper,
            feederGatewayUrl: this.feederGatewayUrl,
            gatewayUrl: this.gatewayUrl
        });
        contract.address = address;

        return new Promise<StarknetContract>((resolve, reject) => {
            iterativelyCheckStatus(
                txHash,
                this.starknetWrapper,
                this.gatewayUrl,
                this.feederGatewayUrl,
                () => resolve(contract),
                reject
            );
        });
    }

    private handleConstructorArguments(constructorArguments: StringMap): string[] {
        if (this.constructorAbi) {
            if (!constructorArguments || Object.keys(constructorArguments).length === 0) {
                throw new HardhatPluginError(PLUGIN_NAME, "Constructor arguments required but not provided.");
            }
            const argumentArray = adaptInput(
                this.constructorAbi.name, constructorArguments, this.constructorAbi.inputs, this.abi
            );

            return argumentArray;
        }

        if (constructorArguments && Object.keys(constructorArguments).length) {
            if (!this.constructorAbi) {
                throw new HardhatPluginError(PLUGIN_NAME, "Constructor arguments provided but not required.");
            }
            // other case already handled
        }

        return [];
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
            starknetWrapper: this.starknetWrapper,
            feederGatewayUrl: this.feederGatewayUrl,
            gatewayUrl: this.gatewayUrl
        });
        contract.address = address;
        return contract;
    }
}

export class StarknetContract {
    private starknetWrapper: StarknetWrapper;
    private abi: starknet.Abi;
    private abiPath: string;
    public address: string;
    private gatewayUrl: string;
    private feederGatewayUrl: string;

    constructor(config: StarknetContractConfig) {
        this.starknetWrapper = config.starknetWrapper;
        this.abiPath = config.abiPath;
        this.abi = readAbi(this.abiPath);
        this.gatewayUrl = config.gatewayUrl;
        this.feederGatewayUrl = config.feederGatewayUrl;
    }

    private async invokeOrCall(choice: Choice, functionName: string, args?: StringMap, signature?: Array<Numeric>) {
        if (!this.address) {
            throw new HardhatPluginError(PLUGIN_NAME, "Contract not deployed");
        }

        const func = <starknet.Function> this.abi[functionName];
        if (!func) {
            const msg = `Function '${functionName}' doesn't exist on this contract.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        if (Array.isArray(args)) {
            throw new HardhatPluginError(PLUGIN_NAME, "Arguments should be passed in the form of an object.");
        }

        const executed = await this.starknetWrapper.invokeOrCall({
            choice,
            address: this.address,
            abi: this.abiPath,
            functionName: functionName,
            inputs: adaptInput(functionName, args, func.inputs, this.abi),
            signature: handleSignature(signature),
            gatewayUrl: this.gatewayUrl,
            feederGatewayUrl: this.feederGatewayUrl
        });
        if (executed.statusCode) {
            const msg = `Could not ${choice} ${functionName}:\n` + executed.stderr.toString();
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
     * @param signature array of transaction signature elements
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async invoke(functionName: string, args?: StringMap, signature?: Array<Numeric>): Promise<void> {
        const executed = await this.invokeOrCall("invoke", functionName, args, signature);
        const txHash = extractTxHash(executed.stdout.toString());

        return new Promise<void>((resolve, reject) => {
            iterativelyCheckStatus(
                txHash,
                this.starknetWrapper,
                this.gatewayUrl,
                this.feederGatewayUrl,
                status => resolve(),
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
     * ```text
     * > 10n
     * ```
     * @param functionName
     * @param args
     * @param signature array of transaction signature elements
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async call(functionName: string, args?: StringMap, signature?: Array<Numeric>): Promise<StringMap> {
        const executed = await this.invokeOrCall("call", functionName, args, signature);
        const func = <starknet.Function> this.abi[functionName];
        const adaptedOutput = adaptOutput(executed.stdout.toString(), func.outputs, this.abi);
        return adaptedOutput;
    }
}
