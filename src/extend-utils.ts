import { Block, HardhatRuntimeEnvironment, Transaction } from "hardhat/types";
import path from "path";
import { SequencerProvider, uint256 } from "starknet";

import { handleInternalContractArtifacts } from "./account-utils";
import {
    ABI_SUFFIX,
    CAIRO1_ASSEMBLY_SUFFIX,
    ETH_ADDRESS,
    SHORT_STRING_MAX_CHARACTERS
} from "./constants";
import { StarknetPluginError } from "./starknet-plugin-error";
import { TransactionReceipt, TransactionTrace } from "./starknet-types";
import { BlockIdentifier, NonceQueryOptions, StarknetContractFactory } from "./types";
import { checkArtifactExists, findPath } from "./utils";

export async function getContractFactoryUtil(hre: HardhatRuntimeEnvironment, contractPath: string) {
    const artifactsPath = hre.config.paths.starknetArtifacts;
    checkArtifactExists(artifactsPath);

    contractPath = contractPath.replace(/\.[^/.]+$/, ""); // remove extension

    const metadataSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}.json`
    );

    const metadataPath = await findPath(artifactsPath, metadataSearchTarget);
    if (!metadataPath) {
        throw new StarknetPluginError(
            `Could not find JSON artifact for "${contractPath}.cairo". Consider recompiling your contracts.`
        );
    }
    const casmSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}${CAIRO1_ASSEMBLY_SUFFIX}`
    );
    const casmPath = await findPath(artifactsPath, casmSearchTarget);

    const abiSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}${ABI_SUFFIX}`
    );
    const abiPath = await findPath(artifactsPath, abiSearchTarget);

    return new StarknetContractFactory({
        metadataPath,
        casmPath,
        abiPath,
        hre
    });
}

export function shortStringToBigIntUtil(convertibleString: string) {
    if (!convertibleString) {
        throw new StarknetPluginError("A non-empty string must be provided");
    }

    if (convertibleString.length > SHORT_STRING_MAX_CHARACTERS) {
        const msg = `Short strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
        throw new StarknetPluginError(msg);
    }

    const invalidChars: { [key: string]: boolean } = {};
    const charArray = [];
    for (const c of convertibleString.split("")) {
        const charCode = c.charCodeAt(0);
        if (charCode > 127) {
            invalidChars[c] = true;
        }
        charArray.push(charCode.toString(16));
    }

    const invalidCharArray = Object.keys(invalidChars);
    if (invalidCharArray.length) {
        const msg = `Non-standard-ASCII character${
            invalidCharArray.length === 1 ? "" : "s"
        }: ${invalidCharArray.join(", ")}`;
        throw new StarknetPluginError(msg);
    }

    return BigInt("0x" + charArray.join(""));
}

export function bigIntToShortStringUtil(convertibleBigInt: bigint) {
    return Buffer.from(convertibleBigInt.toString(16), "hex").toString();
}

export async function getTransactionUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<Transaction> {
    try {
        const transaction = await hre.starknetProvider.getTransaction(txHash);
        return transaction as Transaction;
    } catch (error) {
        const msg = `Could not get the transaction. ${error}`;
        throw new StarknetPluginError(msg);
    }
}

export async function getTransactionReceiptUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<TransactionReceipt> {
    try {
        const receipt = await hre.starknetProvider.getTransactionReceipt(txHash);
        return receipt as unknown as TransactionReceipt;
    } catch (error) {
        const msg = `Could not get the transaction receipt. Error: ${error}`;
        throw new StarknetPluginError(msg);
    }
}

export async function getTransactionTraceUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<TransactionTrace> {
    try {
        const trace = await (hre.starknetProvider as SequencerProvider).getTransactionTrace(txHash);
        return trace as TransactionTrace;
    } catch (error) {
        const msg = `Could not get the transaction trace. Error: ${error}`;
        throw new StarknetPluginError(msg);
    }
}

export async function getBlockUtil(
    hre: HardhatRuntimeEnvironment,
    identifier?: BlockIdentifier
): Promise<Block> {
    if (identifier && typeof identifier !== "object") {
        const msg = `Invalid identifier provided to getBlock: ${identifier}`;
        throw new StarknetPluginError(msg);
    }

    try {
        const blockIdentifier = identifier?.blockHash ?? identifier?.blockNumber;
        const block = hre.starknetProvider.getBlock(blockIdentifier);
        return block;
    } catch (error) {
        const msg = `Could not get block. Error: ${error}`;
        throw new StarknetPluginError(msg);
    }
}

export async function getNonceUtil(
    hre: HardhatRuntimeEnvironment,
    address: string,
    options: NonceQueryOptions
): Promise<number> {
    try {
        const blockIdentifier = options?.blockHash ?? options?.blockNumber;
        const nonce = await hre.starknetProvider.getNonceForAddress(address, blockIdentifier);
        return parseInt(nonce);
    } catch (error) {
        const msg = `Could not get nonce. Error: ${error}`;
        throw new StarknetPluginError(msg);
    }
}

export async function getBalanceUtil(
    address: string,
    hre: HardhatRuntimeEnvironment
): Promise<bigint> {
    const contractPath = handleInternalContractArtifacts("Token", "ERC20", "", hre);
    const contractFactory = await hre.starknet.getContractFactory(contractPath);
    const ethContract = contractFactory.getContractAt(ETH_ADDRESS);

    const result = await ethContract.call("balanceOf", { account: address });
    return uint256.uint256ToBN(result.balance);
}
