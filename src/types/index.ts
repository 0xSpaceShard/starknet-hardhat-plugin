export * from "../legacy/types";
export * as starknetTypes from "./starknet-types";

/**
 * Object whose keys are strings (names) and values are any object.
 */
export interface StringMap {
    [key: string]: any;
}

export type Numeric = number | bigint;

export type BlockNumber = number | "pending" | "latest";

export interface BlockIdentifier {
    blockNumber?: BlockNumber;
    blockHash?: string;
}

export interface ScarbConfig {
    package: {
        name: string;
        version: string;
    };
    target: {
        "starknet-contract": {
            name?: string;
            sierra?: boolean;
            casm?: boolean;
            "casm-add-pythonic-hints"?: boolean;
            "allowed-libfuncs"?: boolean;
            "allowed-libfuncs-deny"?: boolean;
        }[];
    };
    dependencies: StringMap;
}
