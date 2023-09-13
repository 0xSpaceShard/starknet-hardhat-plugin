import fs from "fs";
import os from "os";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import path from "path";
import axios, { AxiosError } from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import {
    CAIRO_COMPILER_BINARY_URL,
    HIDDEN_PLUGIN_COMPILER_SUBDIR,
    HIDDEN_PLUGIN_DIR
} from "./constants";
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

interface CompilerAsset {
    name: string;
    isGzipped: boolean;
}

function getCompilerAsset(): CompilerAsset {
    const platform = os.platform();
    const arch = os.arch();

    if (platform === "linux" && arch === "x64") {
        return {
            name: "release-x86_64-unknown-linux-musl.tar.gz",
            isGzipped: true
        };
    } else if (platform === "darwin" && arch === "arm64") {
        return {
            name: "release-aarch64-apple-darwin.tar",
            isGzipped: false
        };
    }

    throw new Error(
        `Unsupported combination of platform (${platform}) and architecture (${arch}). Consider using a custom compiler (cairo1BinDir in config).`
    );
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
        assertValidCompilerBinary(customCairo1BinDir, "starknet-compile");
        assertValidCompilerBinary(customCairo1BinDir, "starknet-sierra-compile");
        console.log(`Using cairo compiler at ${customCairo1BinDir}`);
        return customCairo1BinDir;
    }

    // default to downloaded binary
    const compilerVersion = starknetConfig?.compilerVersion || config.CAIRO_COMPILER;
    const downloadDistDir = getDownloadDistDir(compilerVersion);
    console.log(`Using downloaded cairo compiler ${compilerVersion}`);

    // download if not present
    const downloadBinDir = path.join(downloadDistDir, "cairo", "bin");
    if (
        !(
            isValidCompilerBinary(path.join(downloadBinDir, "starknet-compile")) &&
            isValidCompilerBinary(path.join(downloadBinDir, "starknet-sierra-compile"))
        )
    ) {
        await downloadAsset(compilerVersion, downloadDistDir);
    }

    return downloadBinDir;
}

function assertValidCompilerBinary(binDirPath: string, command: string): void {
    const compilerBinaryPath = path.join(binDirPath, command);
    if (!fs.existsSync(compilerBinaryPath)) {
        throw new StarknetPluginError(`${compilerBinaryPath} not found`);
    }

    if (!isValidCompilerBinary(compilerBinaryPath)) {
        throw new StarknetPluginError(`${compilerBinaryPath} is not a valid compiler binary`);
    }
}

function isValidCompilerBinary(binaryPath: string): boolean {
    return exec([binaryPath, "--version"].join(" ")).statusCode === 0;
}

async function downloadAsset(version: string, distDir: string): Promise<void> {
    const compilerAsset = getCompilerAsset();
    const assetUrl = `${CAIRO_COMPILER_BINARY_URL}/v${version}/${compilerAsset.name}`;
    const resp = await axios
        .get(assetUrl, {
            responseType: "stream",
            onDownloadProgress: (progressEvent) => {
                // periodically inform the user of download progress (printed on a single line)
                const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                process.stdout.write(`Downloading cairo compiler: ${version} ... ${percentage}%\r`);
            }
        })
        .catch((error) => {
            const parent = error instanceof AxiosError && error;
            if (parent.response?.status === 404) {
                throw new Error(`\nCould not download cairo ${version}. Make sure that it exists.`);
            }
            throw new Error(`\nError downloading cairo ${version} from ${assetUrl}: ${parent}`);
        });
    console.log(`Downloaded cairo compiler ${version}`);

    let pipeline = resp.data;
    if (compilerAsset.isGzipped) {
        pipeline = pipeline.pipe(zlib.createGunzip());
    }

    const extract = tar.extract(distDir);
    pipeline.pipe(extract);

    return new Promise((resolve, _reject) => {
        extract.on("finish", resolve);
    });
}

function getDownloadDistDir(version: string): string {
    const compilerDownloadPath = path.join(
        os.homedir(),
        HIDDEN_PLUGIN_DIR,
        HIDDEN_PLUGIN_COMPILER_SUBDIR,
        version
    );
    return compilerDownloadPath;
}
