import { HttpNetworkConfig } from "hardhat/types";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "./constants";
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

export function getDefaultHttpNetworkConfig(url: string): HttpNetworkConfig {
    return {
        url,
        accounts: undefined,
        gas: undefined,
        gasMultiplier: undefined,
        gasPrice: undefined,
        httpHeaders: undefined,
        timeout: undefined,
    };
}

export async function traverseFiles(traversable: string, fileCriteria = "*") {
    let paths: string[] = [];
    if (fs.lstatSync(traversable).isDirectory()) {
        paths = await globPromise(path.join(traversable, "**", fileCriteria));
    }
    else {
        paths.push(traversable);
    }
    const files = paths.filter(file => { return fs.lstatSync(file).isFile(); });
    return files;
}

export function checkArtifactExists(artifactsPath: string): void {
    if (!fs.existsSync(artifactsPath)) {
        const msg = `Artifact expected to be at ${artifactsPath}, but not found. Consider recompiling your contracts.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

