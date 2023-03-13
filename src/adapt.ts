import { StarknetPluginError } from "./starknet-plugin-error";
import { HEXADECIMAL_REGEX, LEN_SUFFIX } from "./constants";
import * as starknet from "./starknet-types";
import { StringMap } from "./types";

const NAMED_TUPLE_DELIMITER = ": ";
const ARGUMENTS_DELIMITER = ", ";

function isNumeric(value: { toString: () => string }) {
    if (value === undefined || value === null) {
        return false;
    }
    const strValue = value.toString();

    const decimalRegex = /^-?\d+$/;
    return decimalRegex.test(strValue) || HEXADECIMAL_REGEX.test(strValue);
}

const PRIME = BigInt(2) ** BigInt(251) + BigInt(17) * BigInt(2) ** BigInt(192) + BigInt(1);

function toNumericString(value: { toString: () => string }) {
    const num = BigInt(value.toString());
    const nonNegativeNum = ((num % PRIME) + PRIME) % PRIME;
    return nonNegativeNum.toString();
}

function isNamedTuple(type: string) {
    return type.includes(NAMED_TUPLE_DELIMITER);
}

function isTuple(type: string) {
    return type[0] === "(" && type[type.length - 1] === ")";
}

// Can't use String.split since ':' also can be inside type
// Ex: x : (y : felt, z: SomeStruct)
function parseNamedTuple(namedTuple: string): starknet.Argument {
    const index = namedTuple.indexOf(NAMED_TUPLE_DELIMITER);
    const name = namedTuple.substring(0, index);
    const type = namedTuple.substring(name.length + NAMED_TUPLE_DELIMITER.length);

    return { name, type };
}

// Returns types of tuple
function extractMemberTypes(s: string): string[] {
    // Replace all top-level tuples with '#'
    const specialSymbol = "#";

    let i = 0;
    let tmp = "";
    const replacedSubStrings: string[] = [];
    while (i < s.length) {
        if (s[i] === "(") {
            let counter = 1;
            const openningBracket = i;

            // Move to next element after '('
            i++;
            // As invariant we assume that cairo compiler checks
            // that num of '(' === num of ')' so we will terminate
            // before i > s.length
            while (counter) {
                if (s[i] === ")") {
                    counter--;
                }
                if (s[i] === "(") {
                    counter++;
                }

                i++;
            }

            replacedSubStrings.push(s.substring(openningBracket, i));
            // replace tuple with special symbol
            tmp += specialSymbol;

            // Move index back on last ')'
            i--;
        } else {
            tmp += s[i];
        }

        i++;
    }

    let specialSymbolCounter = 0;
    // Now can split as all tuples replaced with '#'
    return tmp.split(ARGUMENTS_DELIMITER).map((type) => {
        // if type contains '#' then replace it with replaced substring
        if (type.includes(specialSymbol)) {
            return type.replace(specialSymbol, replacedSubStrings[specialSymbolCounter++]);
        } else {
            return type;
        }
    });
}
/**
 * Adapts an object of named input arguments to an array of stringified arguments in the correct order.
 *
 * E.g. If your contract has a function
 * ```text
 * func double_sum(x: felt, y: felt) -> (res: felt):
 *     return (res=(x + y) * 2)
 * end
 * ```
 * then running
 * ```typescript
 * const abi = readAbi(...);
 * const funcName = "double_sum";
 * const inputSpecs = abi[funcName].inputs;
 * const adapted = adaptInputUtil(funcName, {x: 1, y: 2}, inputSpecs, abi);
 * console.log(adapted);
 * ```
 * will yield
 * ```text
 * > ["1", "2"]
 * ```
 * @param functionName the name of the function whose input is adapted
 * @param input the input object containing function arguments under their names
 * @param inputSpecs ABI specifications extracted from function.inputs
 * @param abi the ABI artifact of compilation, parsed into an object
 * @returns array containing stringified function arguments in the correct order
 */
export function adaptInputUtil(
    functionName: string,
    input: any,
    inputSpecs: starknet.Argument[],
    abi: starknet.Abi
): string[] {
    const adapted: string[] = [];

    assertLengthMatch(input, inputSpecs, abi, functionName);

    let lastSpec: starknet.Argument = { type: null, name: null };

    inputSpecs.forEach((inputSpec) => {
        const currentValue = input[inputSpec.name];
        if (inputSpec.type === "felt") {
            const errorMsg =
                `${functionName}: Expected "${inputSpec.name}" to be a felt (Numeric); ` +
                `got: ${typeof currentValue}`;
            if (isNumeric(currentValue)) {
                adapted.push(toNumericString(currentValue));
            } else if (inputSpec.name.endsWith(LEN_SUFFIX)) {
                // Prevent throwing error message
            } else {
                throw new StarknetPluginError(errorMsg);
            }
        } else if (inputSpec.type.endsWith("*")) {
            if (!Array.isArray(currentValue)) {
                const msg = `${functionName}: Expected ${inputSpec.name} to be a ${inputSpec.type}`;
                throw new StarknetPluginError(msg);
            }

            const lenName = `${inputSpec.name}${LEN_SUFFIX}`;
            if (lastSpec.name !== lenName || lastSpec.type !== "felt") {
                const msg = `${functionName}: Array size argument ${lenName} (felt) must appear right before ${inputSpec.name} (${inputSpec.type}).`;
                throw new StarknetPluginError(msg);
            }
            // Remove the * from the spec type
            const inputSpecArrayElement = {
                name: inputSpec.name,
                type: inputSpec.type.slice(0, -1)
            };

            adapted.push(currentValue.length.toString());
            for (const element of currentValue) {
                adaptComplexInput(element, inputSpecArrayElement, abi, adapted);
            }
        } else {
            const nestedInput = input[inputSpec.name];
            adaptComplexInput(nestedInput, inputSpec, abi, adapted);
        }

        lastSpec = inputSpec;
    });
    return adapted;
}

/**
 * Similar to `adaptComplexOutput`, but for input. Collects `input` parts into `adaptedArray`.
 * @param input object to be adapted; containing either a struct, a tuple
 * or in the final case that stops the recursion - a number (felt)
 * @param inputSpec specification on how `input` should be interpreted
 * @param abi the ABI resulting form contract compilation
 * @param adaptedArray the array where stringified args are accumulated
 * @returns nothing; everything is accumulated into `adaptedArray`
 */
function adaptComplexInput(
    input: any,
    inputSpec: starknet.Argument,
    abi: starknet.Abi,
    adaptedArray: string[]
): void {
    const type = inputSpec.type;

    if (input === undefined || input === null) {
        throw new StarknetPluginError(`${inputSpec.name} is ${input}`);
    }

    if (type === "felt") {
        if (!isNumeric(input)) {
            const msg = `Expected ${inputSpec.name} to be a felt`;
            throw new StarknetPluginError(msg);
        }
        adaptedArray.push(toNumericString(input));
        return;
    }

    if (isTuple(type)) {
        if (!isNamedTuple(type) && !Array.isArray(input)) {
            const msg = `Expected ${inputSpec.name} to be a tuple`;
            throw new StarknetPluginError(msg);
        }
        assertLengthMatch(input, inputSpec, abi);
        loopInput(input, inputSpec, abi, adaptedArray);
        return;
    }

    // otherwise a struct
    adaptStructInput(input, inputSpec, abi, adaptedArray);
}

function adaptStructInput(
    input: any,
    inputSpec: starknet.Argument,
    abi: starknet.Abi,
    adaptedArray: string[]
) {
    const type = inputSpec.type;
    if (!(type in abi)) {
        throw new StarknetPluginError(`Type ${type} not present in ABI.`);
    }

    assertLengthMatch(input, inputSpec, abi);
    loopInput(input, inputSpec, abi, adaptedArray);
}

function loopInput(
    input: any,
    inputSpec: starknet.Argument,
    abi: starknet.Abi,
    adaptedArray: string[]
) {
    const type = inputSpec.type;

    if (isTuple(type)) {
        const memberTypes = extractMemberTypes(type.slice(1, -1));

        if (isNamedTuple(type)) {
            memberTypes.forEach((memberType) => {
                const memberSpec = parseNamedTuple(memberType);
                const nestedInput = input[memberSpec.name];
                adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
            });
        } else {
            for (let i = 0; i < input.length; ++i) {
                const memberSpec = { name: `${inputSpec.name}[${i}]`, type: memberTypes[i] };
                const nestedInput = input[i];
                adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
            }
        }
    } else {
        const struct = <starknet.Struct>abi[type];
        struct.members.forEach((memberSpec) => {
            const nestedInput = input[memberSpec.name];
            adaptComplexInput(nestedInput, memberSpec, abi, adaptedArray);
        });
    }
}

function assertLengthMatch(input: any, inputSpec: any, abi: starknet.Abi, functionName?: string) {
    if (Array.isArray(inputSpec) && functionName) {
        // User won't pass array length as an argument, so subtract the number of array elements to the expected amount of arguments
        const countArrays = inputSpec.filter((i: any) => i.type.endsWith("*")).length;
        const expectedInputCount = inputSpec.length - countArrays;
        // Initialize an array with the user input
        const inputLen = Object.keys(input || {}).length;
        if (expectedInputCount != inputLen) {
            const msg = `${functionName}: Expected ${expectedInputCount} argument${
                expectedInputCount === 1 ? "" : "s"
            }, got ${inputLen}.`;
            throw new StarknetPluginError(msg);
        }
    } else {
        const type = inputSpec.type;
        if (isTuple(type)) {
            const memberTypes = extractMemberTypes(type.slice(1, -1));
            if (isNamedTuple(type)) {
                // Initialize an array with the user input
                const inputLen = Object.keys(input || {}).length;
                if (inputLen !== memberTypes.length) {
                    const msg = `"${inputSpec.name}": Expected ${memberTypes.length} member${
                        memberTypes.length === 1 ? "" : "s"
                    }, got ${inputLen}.`;
                    throw new StarknetPluginError(msg);
                }
            } else {
                if (input.length != memberTypes.length) {
                    const msg = `"${inputSpec.name}": Expected ${memberTypes.length} member${
                        memberTypes.length === 1 ? "" : "s"
                    }, got ${input.length}.`;
                    throw new StarknetPluginError(msg);
                }
            }
        } else {
            const struct = <starknet.Struct>abi[type];
            const countArrays = struct.members.filter((i) => i.type.endsWith("*")).length;
            const expectedInputCount = struct.members.length - countArrays;
            const inputLen = Object.keys(input || {}).length;
            if (expectedInputCount != inputLen) {
                const msg = `"${inputSpec.name}": Expected ${expectedInputCount} member${
                    expectedInputCount === 1 ? "" : "s"
                }, got ${inputLen}.`;
                throw new StarknetPluginError(msg);
            }
        }
    }
}

/**
 * Adapts the string resulting from a Starknet CLI function call or server purpose of adapting event
 * This is done according to the actual output type specifed by the called function.
 *
 * @param rawResult the actual result in the form of an unparsed string
 * @param outputSpecs array of starknet types in the expected function output
 * @param abi the ABI of the contract whose function was called
 */
export function adaptOutputUtil(
    rawResult: string,
    outputSpecs: starknet.Argument[],
    abi: starknet.Abi
): StringMap {
    const splitStr = rawResult.split(" ");
    const result: bigint[] = [];
    for (const num of splitStr) {
        const parsed = num[0] === "-" ? BigInt(num.substring(1)) * BigInt(-1) : BigInt(num);
        result.push(parsed);
    }
    let resultIndex = 0;
    let lastSpec: starknet.Argument = { type: null, name: null };
    const adapted: StringMap = {};

    for (const outputSpec of outputSpecs) {
        const currentValue = result[resultIndex];
        if (outputSpec.type === "felt") {
            adapted[outputSpec.name] = currentValue;
            resultIndex++;
        } else if (outputSpec.type.endsWith("*")) {
            // Assuming lastSpec refers to the array size argument; not checking its name - done during compilation
            if (lastSpec.type !== "felt") {
                const msg = `Array size argument (felt) must appear right before ${outputSpec.name} (${outputSpec.type}).`;
                throw new StarknetPluginError(msg);
            }

            // Remove * from the spec type
            const outputSpecArrayElementType = outputSpec.type.slice(0, -1);
            const arrLength = parseInt(adapted[lastSpec.name]);

            const structArray = [];

            // Iterate over the struct array, starting at index, starting at `resultIndex`
            for (let i = 0; i < arrLength; i++) {
                // Generate a struct with each element of the array and push it to `structArray`
                const ret = generateComplexOutput(
                    result,
                    resultIndex,
                    outputSpecArrayElementType,
                    abi
                );
                structArray.push(ret.generatedComplex);
                // Next index is the proper raw index returned from generating the struct, which accounts for nested structs
                resultIndex = ret.newRawIndex;
            }
            // New resultIndex is the raw index generated from the last struct
            adapted[outputSpec.name] = structArray;
        } else {
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
function generateComplexOutput(raw: bigint[], rawIndex: number, type: string, abi: starknet.Abi) {
    if (type === "felt") {
        return {
            generatedComplex: raw[rawIndex],
            newRawIndex: rawIndex + 1
        };
    }

    let generatedComplex: any = null;
    if (isTuple(type)) {
        const members = extractMemberTypes(type.slice(1, -1));
        if (isNamedTuple(type)) {
            generatedComplex = {};
            for (const member of members) {
                const memberSpec = parseNamedTuple(member);
                const ret = generateComplexOutput(raw, rawIndex, memberSpec.type, abi);
                generatedComplex[memberSpec.name] = ret.generatedComplex;
                rawIndex = ret.newRawIndex;
            }
        } else {
            generatedComplex = [];
            for (const member of members) {
                const ret = generateComplexOutput(raw, rawIndex, member, abi);
                generatedComplex.push(ret.generatedComplex);
                rawIndex = ret.newRawIndex;
            }
        }
    } else {
        // struct
        if (!(type in abi)) {
            throw new StarknetPluginError(`Type ${type} not present in ABI.`);
        }

        generatedComplex = {};
        const struct = <starknet.Struct>abi[type];
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
