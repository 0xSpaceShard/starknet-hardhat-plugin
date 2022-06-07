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

    /** The transaction passed the validation and entered an actual created block. */
    | "ACCEPTED_ON_L2"

    /** The transaction was accepted on-chain. */
    | "ACCEPTED_ON_L1";

// Types of account implementations
export type AccountImplementationType = "OpenZeppelin" | "Argent";

export type Numeric = number | bigint;

/**
 * Object whose keys are strings (names) and values are any object.
 */
export interface StringMap {
    [key: string]: any;
}

export interface DeployOptions {
    salt?: string;
    token?: string;
}

export interface DeployAccountOptions extends DeployOptions {
    /** Optional hex string. If not provided, a random value is generated. */
    privateKey?: string;
}
