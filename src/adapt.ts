import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "./constants";
import * as starknet from "./starknet-types";

/**
 * If `value` is a single number, the returned array contains only that number.
 * If `value` is an array, the returned array contains adapted elements of the input array.
 *
 * @param value value to be adapted
 * @returns array of nested values
 * @deprecated This will be replaced by a type-checking function
 */
export function adaptInput(value: any) {
    const ret: any[] = [];
    adaptInputRec(value, ret);
    return ret;
}

function adaptInputRec(value: any, storage: any[]) {
    if (typeof value === "number") {
        storage.push(value.toString());
    } else if (Array.isArray(value)) {
        for (const element of value) {
            adaptInputRec(element, storage);
        }
    } else {
        throw new HardhatPluginError(PLUGIN_NAME, `Unknown type used in input: ${value}`);
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
    const adapted: { [key: string]: any } = {};

    for (const expectedEntry of expectedOutput) {
        const currentValue = result[resultIndex];
        if (expectedEntry.type === "felt") {
            adapted[expectedEntry.name] = currentValue;
            resultIndex++;
        }

        else if (expectedEntry.type === "felt*") {
            const lenName = `${expectedEntry.name}_len`;
            if (lastName !== lenName) {
                const msg = `Array size argument ${lastName} must appear right before ${expectedEntry.name}.`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            const arrLength = lastValue;
            const arr = result.slice(resultIndex, resultIndex + arrLength);
            adapted[expectedEntry.name] = arr;
            resultIndex += arrLength;
        }

        else {
            const ret = generateComplex(result, resultIndex, expectedEntry.type, abi);
            adapted[expectedEntry.name] = ret.generatedComplex;
            resultIndex = ret.newRawIndex;
        }

        lastName = expectedEntry.name;
        lastValue = currentValue;
    }

    return adapted;
}

/**
 * Uses the numbers in the `raw` array to generate a tuple/struct of the provided `type`.
 *
 * @param raw array of `felt` instances (numbers) used as material for generating the complex type
 * @param rawIndex current position within the `raw` array
 * @param type type to extract from `raw`, beginning at `rawIndex`
 * @param abi the ABI from which types are taken
 * @returns an object consisting of the next unused index and the generated tuple/struct itself
 */
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
        const struct = <starknet.Struct> abi[type];
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
