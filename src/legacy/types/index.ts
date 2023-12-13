import { BlockNumber, Numeric, StringMap, starknetTypes } from "../../types";

export * from "./contract";

/**
 * According to: https://starknet.io/docs/hello_starknet/intro.html#interact-with-the-contract
 * Not using an enum to avoid code duplication and reverse mapping.
 */
export type TxStatus =
    /** The transaction passed the validation and entered the pending block. */
    | "PENDING"

    /** The transaction has not been received yet (i.e., not written to storage). */
    | "NOT_RECEIVED"

    /** The transaction was received by the operator. */
    | "RECEIVED"

    /** The transaction failed validation and thus was skipped. */
    | "REJECTED"

    /** The transaction passed validation but failed execution, and will be (or was)
     * included in a block (nonce will be incremented and an execution fee will be charged).
     * This status does not distinguish between accepted on L2 / accepted on L1 blocks.
     */
    | "REVERTED"

    /** The transaction passed the validation and entered an actual created block. */
    | "ACCEPTED_ON_L2"

    /** The transaction was accepted on-chain. */
    | "ACCEPTED_ON_L1";

export type InvokeResponse = string;

/**
 * The object returned by starknet tx_status.
 */
export type StatusObject = {
    block_hash: string;
    tx_status: TxStatus;
    tx_failure_reason?: starknetTypes.TxFailureReason;
};

/**
 * Object holding the event name and have a property data of type StingMap.
 */
export interface DecodedEvent {
    name: string;
    data: StringMap;
}

export interface DeclareOptions {
    token?: string;
    signature?: Array<Numeric>;
    sender?: string; // address
    nonce?: Numeric;
    maxFee?: Numeric;
    overhead?: number;
    version?: number;
}

export interface DeployOptions {
    salt?: string;
    unique?: boolean;
    maxFee?: Numeric;
    nonce?: Numeric;
}

export interface DeployAccountOptions {
    maxFee?: Numeric;
    overhead?: number;
}

export interface InvokeOptions {
    signature?: Array<Numeric>;
    nonce?: Numeric;
    maxFee?: Numeric;
    rawInput?: boolean;
    overhead?: number;
}

export interface CallOptions {
    signature?: Array<Numeric>;
    blockNumber?: BlockNumber;
    nonce?: Numeric;
    maxFee?: Numeric;
    rawInput?: boolean;
    rawOutput?: boolean;
    token?: string;
    salt?: string;
    unique?: boolean;
    sender?: string; // address
}

export type EstimateFeeOptions = CallOptions;

export type InteractOptions = InvokeOptions | CallOptions | EstimateFeeOptions;

export type ContractInteractionFunction = (
    functionName: string,
    args?: StringMap,
    options?: InteractOptions
) => Promise<any>;

export type SierraEntryPointsByType = {
    CONSTRUCTOR: SierraContractEntryPointFields[];
    EXTERNAL: SierraContractEntryPointFields[];
    L1_HANDLER: SierraContractEntryPointFields[];
};

export type SierraContractEntryPointFields = {
    selector: string;
    function_idx: number;
};
