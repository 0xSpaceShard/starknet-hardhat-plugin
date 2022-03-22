import { HardhatRuntimeEnvironment, HttpNetworkConfig, NetworksConfig } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";
import {
    ALPHA_MAINNET,
    ALPHA_MAINNET_INTERNALLY,
    ALPHA_TESTNET,
    ALPHA_TESTNET_INTERNALLY,
    DEFAULT_STARKNET_ACCOUNT_PATH,
    PLUGIN_NAME
} from "./constants";
import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { promisify } from "util";
import { StringMap } from "./types";

const globPromise = promisify(glob);
/**
 * Replaces Starknet specific terminology with the terminology used in this plugin.
 *
 * @param msg the log message to be adapted
 * @returns the log message with adaptation replacements
 */
export function adaptLog(msg: string): string {
    return msg.replace("--network", "--starknet-network").replace("gateway_url", "gateway-url");
}

const DOCKER_HOST = "host.docker.internal";
/**
 * Adapts `url` by replacing localhost and 127.0.0.1 with `host.internal.docker`
 * @param url string representing the url to be adapted
 * @returns adapted url
 */
export function adaptUrl(url: string): string {
    if (process.platform === "darwin") {
        for (const protocol of ["http://", "https://", ""]) {
            for (const host of ["localhost", "127.0.0.1"]) {
                if (url === `${protocol}${host}`) {
                    return `${protocol}${DOCKER_HOST}`;
                }

                const prefix = `${protocol}${host}:`;
                if (url.startsWith(prefix)) {
                    return url.replace(prefix, `${protocol}${DOCKER_HOST}:`);
                }
            }
        }
    }

    return url;
}

export function getDefaultHttpNetworkConfig(
    url: string,
    verificationUrl: string,
    chainID: string
): HttpNetworkConfig {
    return {
        url,
        verificationUrl,
        chainID,
        accounts: undefined,
        gas: undefined,
        gasMultiplier: undefined,
        gasPrice: undefined,
        httpHeaders: undefined,
        timeout: undefined
    };
}

export async function traverseFiles(traversable: string, fileCriteria = "*") {
    let paths: string[] = [];
    if (fs.lstatSync(traversable).isDirectory()) {
        paths = await globPromise(path.join(traversable, "**", fileCriteria));
    } else {
        paths.push(traversable);
    }
    const files = paths.filter((file) => fs.lstatSync(file).isFile());
    return files;
}

export function checkArtifactExists(artifactsPath: string): void {
    if (!fs.existsSync(artifactsPath)) {
        const msg = `Artifact expected to be at ${artifactsPath}, but not found. Consider recompiling your contracts.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

/**
 * Extracts the network config from `hre.config.networks` according to `networkName`.
 * @param networkName The name of the network
 * @param networks Object holding network configs
 * @param origin Short string describing where/how `networkName` was specified
 * @returns Network config corresponding to `networkName`
 */
export function getNetwork(
    networkName: string,
    networks: NetworksConfig,
    origin: string
): HttpNetworkConfig {
    if (isMainnet(networkName)) {
        networkName = ALPHA_MAINNET_INTERNALLY;
    } else if (isTestnet(networkName)) {
        networkName = ALPHA_TESTNET_INTERNALLY;
    }

    const network = <HttpNetworkConfig>networks[networkName];
    if (!network) {
        const available = Object.keys(networks).join(", ");
        const msg = `Invalid network provided in ${origin}: ${networkName}.\nValid hardhat networks: ${available}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!network.url) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Cannot use network ${networkName}. No "url" specified.`
        );
    }
    return network;
}

function isTestnet(networkName: string): boolean {
    return networkName === ALPHA_TESTNET || networkName === ALPHA_TESTNET_INTERNALLY;
}

function isMainnet(networkName: string): boolean {
    return networkName === ALPHA_MAINNET || networkName === ALPHA_MAINNET_INTERNALLY;
}

export async function findPath(traversable: string, name: string) {
    let files = await traverseFiles(traversable);
    files = files.filter((f) => f.endsWith(name));
    if (files.length == 0) {
        return null;
    } else if (files.length == 1) {
        return files[0];
    } else {
        const msg =
            "More than one file was found because the path provided is ambiguous, please specify a relative path";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

/**
 *
 * @param accountPath Path where the account file is saved
 * @param hre The HardhatRuntimeEnvironment
 * @returns Absolute where the account file is saved
 */
export function getAccountPath(accountPath: string, hre: HardhatRuntimeEnvironment) {
    let accountDir = accountPath || DEFAULT_STARKNET_ACCOUNT_PATH;

    // Adapt path to be absolute
    if (accountDir[0] === "~") {
        accountDir = path.normalize(path.join(process.env.HOME, accountDir.slice(1)));
    } else if (!path.isAbsolute(accountDir)) {
        const root = hre.config.paths.root;
        accountDir = path.normalize(path.join(root, accountDir));
    }
    return accountDir;
}

export function flattenStringMap(stringMap: StringMap): string[] {
    let result: string[] = [];
    Object.keys(stringMap).forEach((key) => {
        const value = stringMap[key];

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            result = result.concat(flattenStringMap(value));
        } else if (Array.isArray(value)) {
            result = result.concat(value);
        } else {
            result.push(value);
        }
    });
    return result;
}
