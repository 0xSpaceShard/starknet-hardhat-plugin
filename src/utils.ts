import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";
import { ALPHA_MAINNET, ALPHA_MAINNET_INTERNALLY, ALPHA_TESTNET, ALPHA_TESTNET_INTERNALLY, PLUGIN_NAME } from "./constants";
import * as path from "path";
import * as fs from "fs";
import { glob } from "glob";
import { promisify } from "util";

const globPromise = promisify(glob);
/**
 * Replaces Starknet specific terminology with the terminology used in this plugin.
 *
 * @param msg the log message to be adapted
 * @returns the log message with adaptation replacements
 */
export function adaptLog(msg: string): string {
    return msg
        .replace("--network", "--starknet-network")
        .replace("gateway_url", "gateway-url");
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

export function getDefaultHttpNetworkConfig(url: string, verificationUrl: string): HttpNetworkConfig {
    return {
        url,
        verificationUrl: verificationUrl,
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
    const files = paths.filter(file => fs.lstatSync(file).isFile());
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
 * @param hre `HardhatRuntimeEnvironment` holding defined networks
 * @param origin short string describing where/how `networkName` was specified
 * @returns Network config corresponding to `networkName`
 */
export function getNetwork(networkName: string, hre: HardhatRuntimeEnvironment, origin: string): HttpNetworkConfig {
    if (isMainnet(networkName)) {
        networkName = ALPHA_MAINNET_INTERNALLY;
    } else if (isTestnet(networkName)) {
        networkName = ALPHA_TESTNET_INTERNALLY;
    }

    const network = <HttpNetworkConfig> hre.config.networks[networkName];
    if (!network) {
        const available = Object.keys(hre.config.networks).join(", ");
        const msg = `Invalid network provided in ${origin}: ${networkName}.\nValid hardhat networks: ${available}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!network.url) {
        throw new HardhatPluginError(PLUGIN_NAME, `Cannot use network ${networkName}. No "url" specified.`);
    }

    return network;
}

function isTestnet(networkName: string): boolean {
    return networkName === ALPHA_TESTNET
        || networkName === ALPHA_TESTNET_INTERNALLY;
}

function isMainnet(networkName: string): boolean {
    return networkName === ALPHA_MAINNET
        || networkName === ALPHA_MAINNET_INTERNALLY;
}
