export interface Member {
    name: string;
    offset: number;
    type: string;
}

export interface Struct {
    members: Member[];
    name: string;
    size: number;
    type: string;
}

export interface Argument {
    name: string;
    type: string;
}

export interface CairoFunction {
    stateMutability?: string;
    name: string;
    type: "function" | "constructor";
    inputs: Argument[];
    outputs: Argument[];
}

export type AbiEntry = CairoFunction | Struct;

export interface Abi {
    [name: string]: AbiEntry;
}
