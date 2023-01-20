/**
 * Contains typing of Starknet specific objects: ABI related and network response related.
 */

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

export interface EventSpecification {
    data: Argument[];
    keys: string[];
    name: string;
    type: "event";
}

export interface EventAbi {
    [encodedName: string]: EventSpecification;
}

export type AbiEntry = CairoFunction | Struct | EventSpecification;

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

export interface OrderedMessage {
    order: number;
    to_address: string;
    payload: number[];
}

export interface FunctionInvocation {
    call_type: string;
    calldata: string[];
    caller_address: string;
    class_hash: string;
    contract_address: string;
    entry_point_type: string;
    events: Event[];
    execution_resources: ExecutionResources;
    internal_calls: FunctionInvocation[];
    messages: OrderedMessage[];
    result: string[];
    selector: string;
}

export interface TransactionTrace {
    function_invocation?: FunctionInvocation;
    signature: string[];
    validate_invocation?: FunctionInvocation;
    fee_transfer_invocation?: FunctionInvocation;
}

export interface Block {
    block_hash: string;
    parent_block_hash: string;
    block_number: number;
    gas_price: string;
    sequencer_address: string;
    state_root: string;
    status: string;
    timestamp: number;
    transaction_receipts: TransactionReceipt[];
    transactions: TransactionData[];
    starknet_version: string;
}

export interface MintResponse {
    new_balance: number;
    unit: string;
    tx_hash: string;
}

export type TxFailureReason = {
    code: string;
    error_message: string;
    tx_id: string;
};

export type FeeEstimation = {
    amount: bigint;
    unit: string;
    gas_price: bigint;
    gas_usage: bigint;
};
