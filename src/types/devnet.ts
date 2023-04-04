import { Numeric } from ".";
import {
    FlushResponse,
    IncreaseTimeResponse,
    LoadL1MessagingContractResponse,
    SetTimeResponse,
    PredeployedAccount,
    L1ToL2MockTxResponse,
    L2ToL1MockTxResponse,
    NewBlockResponse
} from "../devnet-utils";
import { MintResponse } from "../starknet-types";

export interface Devnet {
    /**
     * Restarts the devnet.
     * @returns void
     * @throws {@link StarknetPluginError}
     */
    restart(): Promise<void>;

    /**
     * Handles all pending L1 to L2 messages and sends them to the other layer
     * @returns {Promise} - Metadata for the flushed messages
     */
    flush: () => Promise<FlushResponse>;

    /**
     * Deploys or loads the L1 messaging contract.
     * @param {string} networkUrl - L1 network url.
     * @param {string} [address] - Address of the contract to be loaded.
     * @param {string} [networkId] - Determines if the ganache or tesnet should be used/
     * @returns
     */
    loadL1MessagingContract: (
        networkUrl: string,
        address?: string,
        networkId?: string
    ) => Promise<LoadL1MessagingContractResponse>;

    /**
     * Sends a mock message from L1 to L2 without running L1.
     * @param {string} l2ContractAddress - Address of the L2 contract.
     * @param {string} functionName - Function name for entry point selector.
     * @param {string} l1ContractAddress - Address of the L1 contract.
     * @param {Array<string>} payload - Payload to send to the L2 network.
     * @param {string} nonce - Nonce value
     * @param {string} paidFeeOnL1 - Paid fee on L1
     * @returns Transaction hash
     */
    sendMessageToL2: (
        l2ContractAddress: string,
        functionName: string,
        l1ContractAddress: string,
        payload: Array<Numeric>,
        nonce: Numeric,
        paidFeeOnL1: Numeric
    ) => Promise<L1ToL2MockTxResponse>;

    /**
     * Sends a mock message from L2 to L1
     * @param {string} l2ContractAddress - Address of the L2 contract.
     * @param {string} l1ContractAddress - Address of the L1 contract.
     * @param {Array<number>} payload - Payload to send to the L1 network.
     * @returns Message hash
     */
    consumeMessageFromL2: (
        l2ContractAddress: string,
        l1ContractAddress: string,
        payload: Array<number>
    ) => Promise<L2ToL1MockTxResponse>;

    /**
     * Increases block time offset
     * @param seconds the offset increase in seconds
     * @returns an object containing the increased block time offset
     */
    increaseTime: (seconds: number) => Promise<IncreaseTimeResponse>;

    /**
     * Sets the timestamp of next block
     * @param seconds timestamp in seconds
     * @returns an object containg next block timestamp
     */
    setTime: (seconds: number) => Promise<SetTimeResponse>;

    /**
     * Fetch the predeployed accounts
     * @returns an object containg array of account's metadata
     */
    getPredeployedAccounts: () => Promise<PredeployedAccount[]>;

    /**
     * Preserves devnet instance to a file
     * @param path  path for the dumping
     * @return void
     */
    dump: (path: string) => Promise<void>;

    /**
     * Loads stored Starknet chain state
     * @param path  path for the dump file
     * @returns void
     */
    load: (path: string) => Promise<void>;

    /**
     * Creates an empty block
     * @returns NewBlockResponse with block hash
     */
    createBlock: () => Promise<NewBlockResponse>;

    /**
     * Assumes there is a /mint endpoint on the current starknet network
     * @param address the address to fund
     * @param amount the amount to fund
     * @param lite whether to make it lite or not
     */
    mint: (address: string, amount: number, lite?: boolean) => Promise<MintResponse>;
}
