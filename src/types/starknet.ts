import { BlockIdentifier, NonceQueryOptions, StarknetContractFactory } from ".";
import { Devnet } from "./devnet";
import { Transaction, TransactionReceipt, Block, TransactionTrace } from "../starknet-types";
import {} from "../account";
import { HardhatNetworkConfig, NetworkConfig } from "hardhat/types/config";
import { ArgentAccount, OpenZeppelinAccount } from "../account";

export interface Starknet {
    /**
     * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
     * the provided string should be `MyContract`.
     * @param name the case-sensitive contract name
     * @returns a factory for generating instances of the desired contract
     */
    getContractFactory: (name: string) => Promise<StarknetContractFactory>;

    /**
     * Cairo and Starknet source files may contain short string literals,
     * which are interpreted as numbers (felts) during Starknet runtime.
     * Use this utility function to provide short string arguments to your contract functions.
     *
     * This function converts such a short string (max 31 characters) to its felt representation (wrapped in a `BigInt`).
     * Only accepts standard ASCII characters, i.e. characters with charcode between 0 and 127, inclusive.
     * @param input the input short string
     * @returns the numeric equivalent of the input short string, wrapped in a `BigInt`
     */
    shortStringToBigInt: (convertableString: string) => bigint;

    /**
     * Converts a BigInt to a string. The opposite of {@link shortStringToBigInt}.
     * @param input the input BigInt
     * @returns a string which is the result of converting a BigInt's hex value to its ASCII equivalent
     */
    bigIntToShortString: (convertableBigInt: bigint) => string;

    /**
     * The selected starknet-network name.
     * Present if the called task relies on `--starknet-network` or `starknet["network"]` in the config object.
     */
    network: string;

    /**
     * The configuration object of the selected starknet-network.
     */
    networkConfig: HardhatNetworkConfig;

    /**
     * @param name the name of the wallet to get
     * @returns a wallet
     */
    getWallet: (name: string) => WalletConfig;

    devnet: Devnet;

    getTransaction: (txHash: string) => Promise<Transaction>;

    getTransactionReceipt: (txHash: string) => Promise<TransactionReceipt>;

    /**
     * Returns execution information in a nested structure of calls.
     * @param txHash the transaction hash
     * @returns the transaction trace
     */
    getTransactionTrace: (txHash: string) => Promise<TransactionTrace>;

    /**
     * Returns an entire block and the transactions contained within it.
     * @param identifier optional block identifier (by block number or hash). To query the latest block, remove the identifier.
     * @returns a block object
     */
    getBlock: (identifier?: BlockIdentifier) => Promise<Block>;

    /**
     * Returns the nonce of the contract whose `address` is specified.
     * @param address the contract address
     * @param options optional arguments to specify the target
     * @returns the nonce
     */
    getNonce: (address: string, options?: NonceQueryOptions) => Promise<number>;

    /**
     * Return balance of target contract whose `address` is specified.
     * @param address of target contract
     * @returns balance of target as BigInt
     */
    getBalance: (address: string) => Promise<bigint>;

    OpenZeppelinAccount: typeof OpenZeppelinAccount;

    ArgentAccount: typeof ArgentAccount;
}

export type StarknetConfig = {
    dockerizedVersion?: string;
    venv?: string;
    wallets?: WalletUserConfig;
    network?: string;
    networkUrl?: string;
    networkConfig?: NetworkConfig;
    recompile?: boolean;
    cairo1BinDir?: string;
    requestTimeout?: number;
};

export type WalletUserConfig = {
    [walletName: string]: WalletConfig | undefined;
};

export type WalletConfig = {
    modulePath: string;
    accountName?: string;
    accountPath?: string;
};
