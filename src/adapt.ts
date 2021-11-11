import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME, LEN_SUFFIX } from "./constants";
import * as starknet from "./starknet-types";

function checkKeyMatchOneSided(keys1: string[], keys2: string[], messageStart: string) {
    const expectedKeys: { [key: string]: boolean } = {};
    for (const key of keys1) {
        expectedKeys[key] = true;
    }

    const extraKeys = [];
    for (const key of keys2) {
        if (!(key in expectedKeys)) {
            extraKeys.push(key);
        }
    }

    if (extraKeys.length) {
        const msg = `${messageStart}: ${extraKeys.join(", ")}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

function checkKeyMatch(input: any, inputSpecs: starknet.Argument[], name: string) {
    const inputKeys = Object.keys(input);
    const expectedKeys = inputSpecs.map(spec => spec.name);
    checkKeyMatchOneSided(inputKeys, expectedKeys, `Extra arguments for ${name}`);
    checkKeyMatchOneSided(expectedKeys, inputKeys, `Missing arguments for ${name}`);
}

/**
 * TODO
 * @param input
 * @param inputSpecs
 * @returns 
 */
export function adaptInput(functionName: string, input: any, inputSpecs: starknet.Argument[], abi: starknet.Abi) {
    const adapted: string[] = [];
    let lastSpec: starknet.Argument = { type: null, name: null };

    for (let i = 0; i < inputSpecs.length; ++i) {
        const inputSpec = inputSpecs[i];
        const currentValue = input[inputSpec.name];
        if (inputSpec.type === "felt") {
            const errorMsg = `${functionName}: Expected ${inputSpec.name} to be a felt`;
            if (Number.isInteger(currentValue)) {
                adapted.push(currentValue.toString());

            } else if (inputSpec.name.endsWith(LEN_SUFFIX)) {
                const nextSpec = inputSpecs[i+1];
                const arrayName = inputSpec.name.slice(0, -LEN_SUFFIX.length);
                if (nextSpec && nextSpec.name === arrayName && nextSpec.type === "felt*" && arrayName in input) {
                    // will add array length in next iteration
                } else {
                    throw new HardhatPluginError(PLUGIN_NAME, errorMsg);
                }
            } else {
                throw new HardhatPluginError(PLUGIN_NAME, errorMsg);
            }

        } else if (inputSpec.type === "felt*") {
            if (!Array.isArray(currentValue)) {
                const msg = `${functionName}: Expected ${inputSpec.name} to be a felt*`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }

            const lenName = `${inputSpec.name}${LEN_SUFFIX}`;
            if (lastSpec.name !== lenName || lastSpec.type !== "felt") {
                const msg = `${functionName}: Array size argument ${lenName} (felt) must appear right before ${inputSpec.name} (felt*).`
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }

            adapted.push(currentValue.length.toString());
            for (const element of currentValue) {
                adapted.push(element.toString());
            }

        } else {
            const nestedInput = input[inputSpec.name];
            adaptComplexInput(nestedInput, inputSpec, abi, adapted);
        }

        lastSpec = inputSpec;
    }

    return adapted;
}

function adaptComplexInput(input: any, inputSpec: starknet.Argument, abi: starknet.Abi, adaptedArray: string[]): void {
    const type = inputSpec.type;

    if (input === undefined || input === null) {
        throw new HardhatPluginError(PLUGIN_NAME, `${inputSpec.name} is ${input}`);
    }

    if (type === "felt") {
        if (Number.isInteger(input)) {
            adaptedArray.push(input.toString());
            return;
        }
        const msg = `Expected ${inputSpec.name} to be a felt`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (type[0] === "(" && type[type.length-1] === ")") {
        if (!Array.isArray(input)) {
            const msg = `Expected ${inputSpec.name} to be a tuple`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        const memberTypes = type.slice(1, -1).split(", ");

        for (let i = 0; i < input.length; ++i) {
            const memberSpec = { name: `${inputSpec.name}[${i}]`, type: memberTypes[i] };
            const nestedInput = input[i];
            adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
        }

        return;
    }

    // otherwise a struct
    if (!(type in abi)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Type ${type} not present in ABI.`);
    }

    const generatedComplex: any = {};
    const struct = <starknet.Struct> abi[type];

    for (let i = 0; i < struct.members.length; ++i) {
        const memberSpec = struct.members[i];
        const nestedInput = input[memberSpec.name];
        adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
    }

    return generatedComplex;
}

/**
 * Adapts the string resulting from a Starknet CLI function call.
 * This is done according to the actual output type specifed by the called function.
 *
 * @param result the actual result, basically an unparsed string
 * @param outputSpecs array of starknet types in the expected function output
 * @param abi the ABI of the contract whose function was called
 */
export function adaptOutput(rawResult: string, outputSpecs: starknet.Argument[], abi: starknet.Abi): any {
    const splitStr = rawResult.split(" ");
    const result = [];
    for (const num of splitStr) {
        result.push(parseInt(num));
    }

    let resultIndex = 0;
    let lastSpec: starknet.Argument = { type: null, name: null };
    const adapted: { [key: string]: any } = {};

    for (const outputSpec of outputSpecs) {
        const currentValue = result[resultIndex];
        if (outputSpec.type === "felt") {
            adapted[outputSpec.name] = currentValue;
            resultIndex++;
        }

        else if (outputSpec.type === "felt*") {
            const lenName = `${outputSpec.name}${LEN_SUFFIX}`;
            if (lastSpec.name !== lenName || lastSpec.type !== "felt") {
                const msg = `Array size argument ${lenName} (felt) must appear right before ${outputSpec.name} (felt*).`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
            const arrLength = adapted[lenName];
            const arr = result.slice(resultIndex, resultIndex + arrLength);
            adapted[outputSpec.name] = arr;
            resultIndex += arrLength;
        }

        else {
            const ret = generateComplexOutput(result, resultIndex, outputSpec.type, abi);
            adapted[outputSpec.name] = ret.generatedComplex;
            resultIndex = ret.newRawIndex;
        }

        lastSpec = outputSpec;
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
function generateComplexOutput(raw: any[], rawIndex: number, type: string, abi: starknet.Abi) {
    if (type === "felt") {
        return {
            generatedComplex: <number> raw[rawIndex],
            newRawIndex: rawIndex + 1
        }
    }

    let generatedComplex: any = null;
    if (type[0] === "(" && type[type.length-1] === ")") {
        const members = type.slice(1, -1).split(", ");

        generatedComplex = [];
        for (const member of members) {
            const ret = generateComplexOutput(raw, rawIndex, member, abi);
            generatedComplex.push(ret.generatedComplex);
            rawIndex = ret.newRawIndex;
        }

    } else {// struct
        if (!(type in abi)) {
            throw new HardhatPluginError(PLUGIN_NAME, `Type ${type} not present in ABI.`);
        }

        generatedComplex = {};
        const struct = <starknet.Struct> abi[type];
        for (const member of struct.members) {
            const ret = generateComplexOutput(raw, rawIndex, member.type, abi);
            generatedComplex[member.name] = ret.generatedComplex;
            rawIndex = ret.newRawIndex;
        }
    }

    return {
        generatedComplex,
        newRawIndex: rawIndex
    };
}
