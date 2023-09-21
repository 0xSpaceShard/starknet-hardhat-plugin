import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CallData, ProviderInterface, events as eventUtil, json } from "starknet";

import { StarknetPluginError } from "../../starknet-plugin-error";
import {
    StarknetContractConfig,
    StringMap,
    InvokeOptions,
    InvokeResponse,
    CallOptions,
    EstimateFeeOptions,
    DecodedEvent,
    BlockNumber,
    starknetTypes
} from "../../types";
import { copyWithBigint } from "../../utils";
import {
    readAbi,
    mapAbi,
    InteractChoice,
    iterativelyCheckStatus,
    formatFelt,
    adaptInputUtil,
    adaptOutputUtil
} from "../utils";
import { StarknetContractFactory } from "./starknet-contract-factory";

/**
 * Returns a modified copy of the provided object with its blockNumber set to pending.
 * @param options the options object with a blockNumber key
 */
function defaultToPendingBlock<T extends { blockNumber?: BlockNumber }>(options: T): T {
    const adaptedOptions = copyWithBigint<T>(options);
    if (adaptedOptions.blockNumber === undefined) {
        // using || operator would not handle the zero case correctly
        adaptedOptions.blockNumber = "pending";
    }
    return adaptedOptions;
}

export class StarknetContract {
    private hre: HardhatRuntimeEnvironment;
    protected abi: starknetTypes.Abi;
    protected abiPath: string;
    protected abiRaw: string;
    private isCairo1: boolean;
    private _address: string;
    public deployTxHash: string;

    constructor(config: StarknetContractConfig) {
        this.hre = config.hre;
        this.abiPath = config.abiPath;
        this.abiRaw = config.abiRaw ?? readAbi(this.abiPath);
        this.abi = mapAbi(this.abiRaw);
        this.isCairo1 = config.isCairo1;
    }

    get address(): string {
        return this._address;
    }

    set address(address: string) {
        this._address = address;
        return;
    }

    get provider(): ProviderInterface {
        return this.hre.starknetProvider;
    }

    /**
     * Set a custom abi and abi path to the contract
     * @param implementation the contract factory of the implementation to be set
     */
    setImplementation(implementation: StarknetContractFactory): void {
        this.abi = implementation.abi;
        this.abiPath = implementation.abiPath;
    }

    /**
     * Invoke the function by name and optionally provide arguments in an array.
     * For a usage example @see {@link call}
     * @param functionName
     * @param args arguments to Starknet contract function
     * @options optional additions to invoking
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async invoke(
        functionName: string,
        args?: StringMap,
        options: InvokeOptions = {}
    ): Promise<InvokeResponse> {
        try {
            const adaptedInput = options.rawInput
                ? <string[]>args
                : this.adaptInput(functionName, args);

            const { transaction_hash: txHash } = await this.provider.invokeFunction(
                {
                    contractAddress: this.address,
                    entrypoint: functionName,
                    calldata: adaptedInput,
                    signature: options.signature.map(String)
                },
                {
                    nonce: options.nonce ?? (await this.provider.getNonceForAddress(this.address)),
                    maxFee: options.maxFee,
                    version: InteractChoice.INVOKE.transactionVersion
                }
            );

            return new Promise<string>((resolve, reject) => {
                iterativelyCheckStatus(
                    txHash,
                    this.hre,
                    () => resolve(txHash),
                    (error) => {
                        reject(new StarknetPluginError(`Invoke transaction ${txHash}: ${error}`));
                    }
                );
            });
        } catch (error) {
            if (!(error instanceof Error)) throw error;

            throw new StarknetPluginError(error.message, error);
        }
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
     *
     * If options.rawOutput, the Promised object holds a property `response` with an array of strings.
     *
     * @param functionName
     * @param args arguments to Starknet contract function
     * @param options optional additions to calling
     * @returns a Promise that resolves when the status of the transaction is at least `PENDING`
     */
    async call(
        functionName: string,
        args?: StringMap,
        options: CallOptions = {}
    ): Promise<StringMap> {
        try {
            const adaptedOptions = defaultToPendingBlock(options);
            const adaptedInput = adaptedOptions.rawInput
                ? <string[]>args
                : this.adaptInput(functionName, args);

            const { result } = await this.provider.callContract(
                {
                    contractAddress: this.address,
                    entrypoint: functionName,
                    calldata: adaptedInput
                },
                adaptedOptions.blockNumber
            );
            // align to legacy stdout output
            const response = result.map(formatFelt).join(" ");

            if (options.rawOutput) {
                return { response };
            }
            return this.adaptOutput(functionName, response);
        } catch (error) {
            if (!(error instanceof Error)) throw error;

            throw new StarknetPluginError(error.message, error);
        }
    }

    /**
     * Computes L1-to-L2 message fee estimation
     * @param {string} functionName Function name for entry point selector
     * @param {StringMap} args - Arguments to Starknet contract function
     * @returns Fee estimation
     */
    async estimateMessageFee(functionName: string, args: StringMap) {
        // Check if functionName is annotated with @l1_handler
        const func = <starknetTypes.CairoFunction>this.abi[functionName];

        if (!func?.type || func.type.toString() !== "l1_handler") {
            throw new StarknetPluginError(
                `Cannot estimate message fee on "${functionName}" - not an @l1_handler`
            );
        }
        const adaptedInput = this.adaptInput(functionName, args);
        // Remove value of from_address from the input array
        const fromAddress = adaptedInput.shift();
        return this.hre.starknetWrapper.estimateMessageFee(
            functionName,
            fromAddress,
            this.address,
            adaptedInput
        );
    }

    /**
     * Estimate the gas fee of executing `functionName` with `args`.
     * @param functionName
     * @param args arguments to Starknet contract function
     * @param options optional execution specifications
     * @returns an object containing the amount and the unit of the estimation
     */
    async estimateFee(
        functionName: string,
        args?: StringMap,
        options: EstimateFeeOptions = {}
    ): Promise<starknetTypes.FeeEstimation> {
        try {
            const { nonce, maxFee, signature } = defaultToPendingBlock(options);
            const result = await this.provider.getInvokeEstimateFee(
                {
                    contractAddress: this.address,
                    calldata: args,
                    signature: signature.map(String)
                },
                {
                    nonce: nonce ?? (await this.provider.getNonceForAddress(this.address)),
                    maxFee: maxFee,
                    version: InteractChoice.ESTIMATE_FEE.transactionVersion
                },
                options.blockNumber
            );

            return {
                amount: result.overall_fee,
                unit: "wei",
                gas_price: result.gas_price,
                gas_usage: result.gas_consumed
            };
        } catch (error) {
            if (!(error instanceof Error)) throw error;

            throw new StarknetPluginError(error.message, error);
        }
    }

    /**
     * Returns the ABI of the whole contract.
     * @returns contract ABI
     */
    getAbi(): starknetTypes.Abi {
        return this.abi;
    }

    /**
     * Adapt structured `args` to unstructured array expected by e.g. Starknet CLI.
     * @param functionName the name of the function to adapt
     * @param args structured args
     * @returns unstructured args
     */
    adaptInput(functionName: string, args?: StringMap): string[] {
        const func = <starknetTypes.CairoFunction>this.abi[functionName];
        if (!func) {
            const msg = `Function '${functionName}' doesn't exist on ${this.abiPath}.`;
            throw new StarknetPluginError(msg);
        }

        if (Array.isArray(args)) {
            throw new StarknetPluginError("Arguments should be passed in the form of an object.");
        }

        return adaptInputUtil(functionName, args, func.inputs, this.abi, this.isCairo1);
    }

    /**
     * Adapt unstructured `rawResult` to a structured object.
     * @param functionName the name of the function that produced the output
     * @param rawResult the function output as as unparsed space separated string
     * @returns structured output
     */
    adaptOutput(functionName: string, rawResult: string) {
        const func = <starknetTypes.CairoFunction>this.abi[functionName];
        return adaptOutputUtil(rawResult, func.outputs, this.abi);
    }

    /**
     * Decode the events to a structured object with parameter names.
     * Only decodes the events originating from this contract.
     * @param events as received from the server.
     * @returns structured object with parameter names.
     * @throws if no events decoded
     */
    decodeEvents(events: starknetTypes.Event[]): DecodedEvent[] {
        const abi = json.parse(this.abiRaw);
        const abiEvents = eventUtil.getAbiEvents(abi);
        const abiStructs = CallData.getAbiStruct(abi);

        const decodedEvents = eventUtil
            .parseEvents(events, abiEvents, abiStructs, {})
            .map((event) => {
                const [name, data] = Object.entries(event)[0];
                return { name, data };
            });
        return decodedEvents;
    }
}
