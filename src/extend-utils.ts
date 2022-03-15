import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import { ABI_SUFFIX, PLUGIN_NAME, SHORT_STRING_MAX_CHARACTERS } from "./constants";
import { AccountImplementationType, StarknetContractFactory } from "./types";
import { Account, ArgentAccount, OpenZeppelinAccount } from "./account";
import { checkArtifactExists, findPath, getAccountPath } from "./utils";

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
        throw new HardhatPluginError(PLUGIN_NAME, `Could not find metadata for ${contractPath}`);
    }

    const abiSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}${ABI_SUFFIX}`
    );
    const abiPath = await findPath(artifactsPath, abiSearchTarget);
    if (!abiPath) {
        throw new HardhatPluginError(PLUGIN_NAME, `Could not find ABI for ${contractPath}`);
    }

    return new StarknetContractFactory({
        starknetWrapper: hre.starknetWrapper,
        metadataPath,
        abiPath,
        networkID: hre.config.starknet.network,
        gatewayUrl: hre.config.starknet.networkUrl,
        feederGatewayUrl: hre.config.starknet.networkUrl
    });
}

export function shortStringToBigIntUtil(convertableString: string) {
    if (!convertableString) {
        throw new HardhatPluginError(PLUGIN_NAME, "A non-empty string must be provided");
    }

    if (convertableString.length > SHORT_STRING_MAX_CHARACTERS) {
        const msg = `Short strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
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
        throw new HardhatPluginError(PLUGIN_NAME, msg);
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
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
    wallet.accountPath = getAccountPath(wallet.accountPath, hre);
    return wallet;
}

export async function deployAccountUtil(
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment
): Promise<Account> {
    let account: Account;
    switch (accountType) {
        case "OpenZeppelin":
            account = await OpenZeppelinAccount.deployFromABI(hre);
            break;
        case "Argent":
            account = await ArgentAccount.deployFromABI(hre);
            break;
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }

    return account;
}

export async function getAccountFromAddressUtil(
    address: string,
    privateKey: string,
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment
): Promise<Account> {
    let account: Account;
    switch (accountType) {
        case "OpenZeppelin":
            account = await OpenZeppelinAccount.getAccountFromAddress(address, privateKey, hre);
            break;
        case "Argent":
            account = await ArgentAccount.getAccountFromAddress(address, privateKey, hre);
            break;
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }

    return account;
}
