import fs from "node:fs";
import { LegacyContractClass, SierraContractClass, hash, json } from "starknet";

import { StarknetPluginError } from "../../starknet-plugin-error";
import { starknetTypes } from "../../types";

/**
 * Reads the ABI from `abiPath`
 */

export function readAbi(abiPath: string): string {
    return hash.formatSpaces(fs.readFileSync(abiPath).toString("ascii").trim());
}
/**
 * Extracts the ABI from the contract
 */

export function getFallbackAbi(contract: LegacyContractClass | SierraContractClass): string {
    return hash.formatSpaces(
        typeof contract.abi === "string" ? contract.abi : json.stringify(contract.abi)
    );
}
/**
 * Converts `rawAbi` to an object for lookup by name
 */

export function mapAbi(rawAbi: string): starknetTypes.Abi {
    const abiArray = json.parse(rawAbi);
    const abi: starknetTypes.Abi = {};
    extractAbiEntries(abiArray, abi);
    return abi;
}
/**
 * Recursively extract abi entries and populate the provided `abi` object.
 */
function extractAbiEntries(abiArray: starknetTypes.AbiEntry[], abi: starknetTypes.Abi) {
    for (const abiEntry of abiArray) {
        if ("items" in abiEntry) {
            extractAbiEntries(abiEntry.items, abi);
        } else {
            if (!abiEntry.name) {
                const msg = `Abi entry has no name: ${abiEntry}`;
                throw new StarknetPluginError(msg);
            }
            abi[abiEntry.name] = abiEntry;
        }
    }
}
