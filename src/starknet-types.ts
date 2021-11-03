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

export interface Function {
    stateMutability?: string;
    name: string;
    type: string;
    inputs: Argument[];
    outputs: Argument[];
}

export type AbiEntry = Function | Struct;

export interface Abi {
    [name: string]: AbiEntry;
}