import { StarknetPluginError } from "./starknet-plugin-error";
import { Block, HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import { ABI_SUFFIX, SHORT_STRING_MAX_CHARACTERS } from "./constants";
import { BlockIdentifier, NonceQueryOptions, StarknetContractFactory } from "./types";
import { checkArtifactExists, findPath, getAccountPath } from "./utils";
import { Transaction, TransactionReceipt, TransactionTrace } from "./starknet-types";
import { handleInternalContractArtifacts } from "./account-utils";
import { ETH_ADDRESS } from "./constants";
import { uint256ToBN } from "starknet/dist/utils/uint256";

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

    const abiSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}${ABI_SUFFIX}`
    );
    const abiPath = await findPath(artifactsPath, abiSearchTarget);
    if (!abiPath) {
        throw new StarknetPluginError(
            `Could not find ABI JSON artifact for "${contractPath}.cairo". Consider recompiling your contracts.`
        );
    }

    return new StarknetContractFactory({
        metadataPath,
        abiPath,
        hre
    });
}

export function shortStringToBigIntUtil(convertableString: string) {
    if (!convertableString) {
        throw new StarknetPluginError("A non-empty string must be provided");
    }

    if (convertableString.length > SHORT_STRING_MAX_CHARACTERS) {
        const msg = `Short strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
        throw new StarknetPluginError(msg);
    }

    const invalidChars: { [key: string]: boolean } = {};
    const charArray = [];
    for (const c of convertableString.split("")) {
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

export function bigIntToShortStringUtil(convertableBigInt: BigInt) {
    return Buffer.from(convertableBigInt.toString(16), "hex").toString();
}

export function getWalletUtil(name: string, hre: HardhatRuntimeEnvironment) {
    const wallet = hre.config.starknet.wallets[name];
    if (!wallet) {
        const available = Object.keys(hre.config.starknet.wallets).join(", ");
        const msg = `Invalid wallet name provided: ${name}.\nValid wallets: ${available}`;
        throw new StarknetPluginError(msg);
    }
    wallet.accountPath = getAccountPath(wallet.accountPath, hre);
    return wallet;
}

export async function getTransactionUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<Transaction> {
    const executed = await hre.starknetWrapper.getTransaction({
        hash: txHash
    });
    if (executed.statusCode) {
        const msg = `Could not get the transaction. ${executed.stderr.toString()}`;
        throw new StarknetPluginError(msg);
    }
    const txReceipt = JSON.parse(executed.stdout.toString()) as Transaction;
    return txReceipt;
}

export async function getTransactionReceiptUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<TransactionReceipt> {
    const executed = await hre.starknetWrapper.getTransactionReceipt({
        hash: txHash
    });
    if (executed.statusCode) {
        const msg = `Could not get the transaction receipt. Error: ${executed.stderr.toString()}`;
        throw new StarknetPluginError(msg);
    }
    const txReceipt = JSON.parse(executed.stdout.toString()) as TransactionReceipt;
    return txReceipt;
}

export async function getTransactionTraceUtil(
    txHash: string,
    hre: HardhatRuntimeEnvironment
): Promise<TransactionTrace> {
    const executed = await hre.starknetWrapper.getTransactionTrace({
        hash: txHash
    });

    if (executed.statusCode) {
        const msg = `Could not get the transaction trace. Error: ${executed.stderr.toString()}`;
        throw new StarknetPluginError(msg);
    }
    const txTrace = JSON.parse(executed.stdout.toString()) as TransactionTrace;
    return txTrace;
}

export async function getBlockUtil(
    hre: HardhatRuntimeEnvironment,
    identifier?: BlockIdentifier
): Promise<Block> {
    const blockOptions = {
        feederGatewayUrl: hre.starknet.networkConfig.url,
        gatewayUrl: hre.starknet.networkConfig.url,
        number: identifier?.blockNumber,
        hash: identifier?.blockHash
    };

    if (identifier && typeof identifier !== "object") {
        const msg = `Invalid identifier provided to getBlock: ${identifier}`;
        throw new StarknetPluginError(msg);
    }

    if (blockOptions.number == null && !blockOptions.hash) {
        blockOptions.number = "latest";
    }

    const executed = await hre.starknetWrapper.getBlock(blockOptions);

    if (executed.statusCode) {
        const msg = `Could not get block. Error: ${executed.stderr.toString()}`;
        throw new StarknetPluginError(msg);
    }
    const block = JSON.parse(executed.stdout.toString()) as Block;
    return block;
}

export async function getNonceUtil(
    hre: HardhatRuntimeEnvironment,
    address: string,
    options: NonceQueryOptions
): Promise<number> {
    const executed = await hre.starknetWrapper.getNonce({
        address,
        ...options
    });

    if (executed.statusCode) {
        const msg = `Could not get nonce. Error: ${executed.stderr.toString()}`;
        throw new StarknetPluginError(msg);
    }

    return parseInt(executed.stdout.toString());
}

export async function getBalanceUtil(
    address: string,
    hre: HardhatRuntimeEnvironment
): Promise<BigInt> {
    const contractPath = handleInternalContractArtifacts("Token", "ERC20", "", hre);
    const contractFactory = await hre.starknet.getContractFactory(contractPath);
    const ethContract = contractFactory.getContractAt(ETH_ADDRESS);

    const result = await ethContract.call("balanceOf", { account: address });
    const convertedBalance = uint256ToBN(result.balance).toString();

    return BigInt(convertedBalance);
}
