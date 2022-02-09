import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

import {
    ABI_SUFFIX,
    DEFAULT_STARKNET_NETWORK,
    PLUGIN_NAME,
    SHORT_STRING_MAX_CHARACTERS
} from "./constants";
import { StarknetContractFactory } from "./types";
import { checkArtifactExists, findPath, getAccountPath, getNetwork } from "./utils";

export async function getContractFactoryUtil(
    hre: HardhatRuntimeEnvironment,
    contractPath: string,
    networkUrl?: string
) {
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

    let gateway;
    let testNetworkName;
    if (networkUrl) {
        gateway = networkUrl;
    } else {
        testNetworkName = hre.config.starknet.network || DEFAULT_STARKNET_NETWORK;
        const network = getNetwork(testNetworkName, hre, "starknet.network");
        gateway = network.url;
    }

    return new StarknetContractFactory({
        starknetWrapper: hre.starknetWrapper,
        metadataPath,
        abiPath,
        networkID: testNetworkName,
        gatewayUrl: gateway,
        feederGatewayUrl: gateway
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
