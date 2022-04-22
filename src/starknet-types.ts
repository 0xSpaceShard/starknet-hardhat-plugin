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

export interface Event {
    data: string[];
    from_address: string;
    keys: string[];
}

export interface BuiltinInstanceCounter {
    bitwise_builtin: number;
    ec_op_builtin: number;
    ecdsa_builtin: number;
    output_builtin: number;
    pedersen_builtin: number;
    range_check_builtin: number;
}

export interface ExecutionResources {
    builtin_instance_counter: BuiltinInstanceCounter;
    n_memory_holes: number;
    n_steps: number;
}

export interface TransactionReceipt {
    block_hash: string;
    block_number: number;
    events: Event[];
    execution_resources: ExecutionResources;
    l2_to_l1_messages: L2ToL1Message[];
    status: string;
    transaction_hash: string;
    transaction_index: number;
}

export interface L2ToL1Message {
    from_address: string;
    payload: string[];
    to_address: string;
}

export interface TransactionData {
    calldata: string[];
    contract_address: string;
    entry_point_selector: string;
    entry_point_type: string;
    max_fee: string;
    signature: string[];
    transaction_hash: string;
    type: string;
}

export interface Transaction {
    block_hash: string;
    block_number: number;
    status: string;
    transaction: TransactionData;
    transaction_index: number;
}

export interface Block {
    block_hash: string;
    parent_block_hash: string;
    block_number: number;
    state_root: string;
    status: string;
    timestamp: number;
    transaction_receipts: Record<string, unknown>;
    transactions: Record<string, unknown>;
}
