import {
    FlushResponse,
    IncreaseTimeResponse,
    LoadL1MessagingContractResponse,
    SetTimeResponse,
    PredeployedAccount
} from "../devnet-utils";
import { Block } from "../starknet-types";

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
     * @returns the empty block
     */
    createBlock: () => Promise<Block>;
}
