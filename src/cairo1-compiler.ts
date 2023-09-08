import os from "os";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import path from "path";
import axios from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import { CAIRO_COMPILER_BINARY_URL, HIDDEN_PLUGIN_DIR } from "./constants";
import { StarknetConfig } from "./types/starknet";
import config from "../config.json";
import tar from "tar-fs";
import zlib from "zlib";
import { TaskArguments } from "hardhat/types";

export const exec = (args: string) => {
    const result = shell.exec(args, {
        silent: true
    });

    return {
        statusCode: result.code,
        stdout: Buffer.from(result.stdout),
        stderr: Buffer.from(result.stderr)
    } as ProcessResult;
};

function getCompilerAssetName(): string {
    const platform = os.platform();
    switch (os.platform()) {
        case "linux":
            return "release-x86_64-unknown-linux-musl.tar.gz";
        case "darwin":
            return "release-aarch64-apple-darwin.tar";
        default:
            throw new Error(`Unsupported OS: ${platform}.`);
    }
}

export async function getCairoBinDirPath(cliArgs: TaskArguments, starknetConfig: StarknetConfig) {
    if (starknetConfig?.cairo1BinDir && starknetConfig?.compilerVersion) {
        const msg =
            "Error in config file. Only one of (starknet.cairo1BinDir, starknet.compilerVersion) can be specified.";
        throw new StarknetPluginError(msg);
    }

    // give precedence to CLI specification
    const customCairo1BinDir = cliArgs?.cairo1BinDir || starknetConfig?.cairo1BinDir;
    if (customCairo1BinDir) {
        return customCairo1BinDir; // _TODO add check?
    }

    // default to downloaded binary
    const compilerVersion = starknetConfig?.compilerVersion || config.CAIRO_COMPILER;
    const downloadDistDir = getDownloadDistDir(compilerVersion);

    // download if not present
    const downloadBinDir = path.join(downloadDistDir, "cairo", "bin");
    if (
        !(
            isBinaryExecutable(path.join(downloadBinDir, "starknet-compile")) &&
            isBinaryExecutable(path.join(downloadBinDir, "starknet-sierra-compile"))
        )
    ) {
        await downloadAsset(compilerVersion, downloadDistDir);
    }

    return path.join(downloadDistDir, "cairo", "bin");
}

function isBinaryExecutable(binaryPath: string): boolean {
    return exec([binaryPath, "--version"].join(" ")).statusCode === 0;
}

async function downloadAsset(version: string, distDir: string): Promise<void> {
    const assetUrl = `${CAIRO_COMPILER_BINARY_URL}/v${version}/${getCompilerAssetName()}`;
    const resp = await axios
        .get(assetUrl, {
            responseType: "stream",
            onDownloadProgress: (progressEvent) => {
                const totalLength = progressEvent.total;
                const downloadedLength = progressEvent.loaded;
                const percentage = Math.round((downloadedLength / totalLength) * 100);
                process.stdout.write(
                    `Downloading cairo compiler version: ${version} ... ${percentage}%\r`
                );
                // _TODO preserve last log line?
            }
        })
        .catch((error) => {
            const parent = error instanceof Error && error;
            throw new Error(`Error downloading cairo ${version} from ${assetUrl}: ${parent}`);
        });

    const extract = tar.extract(distDir);
    resp.data.pipe(zlib.createGunzip()).pipe(extract);
    return new Promise((resolve, _reject) => {
        extract.on("finish", resolve);
    });
}

function getDownloadDistDir(version: string): string {
    const homeDir = os.homedir();
    const compilerDownloadPath = path.join(homeDir, HIDDEN_PLUGIN_DIR, "cairo-compiler", version);
    return compilerDownloadPath;
}
