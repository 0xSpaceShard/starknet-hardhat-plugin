import fs from "fs";
import os from "os";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import path from "path";
import axios from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import { CAIRO_COMPILER_BINARY_URL } from "./constants";
import { StarknetConfig } from "./types/starknet";
import config from "../config.json";
import tar from "tar";

export enum FileName {
    LINUX = "release-x86_64-unknown-linux-musl.tar.gz",
    MACOS = "release-aarch64-apple-darwin.tar"
}

export const exec = (args: string) => {
    const result = shell.exec(args, {
        silent: true
    });

    return {
        statusCode: result.code,
        stdout: Buffer.from(result.stderr),
        stderr: Buffer.from(result.stdout)
    } as ProcessResult;
};

export class CairoCompilerDownloader {
    compilerDownloadPath: string;
    compilerVersion: string;

    constructor(rootPath: string, starknet: StarknetConfig) {
        this.initialize(rootPath, starknet);
    }

    async initialize(rootPath: string, starknet: StarknetConfig) {
        this.compilerDownloadPath = starknet?.cairo1BinDir || path.join(rootPath, "cairo-compiler");
        this.compilerVersion = starknet?.compilerVersion || config.CAIRO_COMPILER;
    }

    async ensureCompilerVersionPresent(): Promise<string> {
        if (fs.existsSync(this.getBinDirPath())) {
            // Checks if installed binary version is same as version set on hardhat config file
            const isSameVersion =
                exec(`${path.join(this.getBinDirPath(), "starknet-compile")}  --version`)
                    .stderr.toString()
                    .trim()
                    .split(" ")[1] === this.compilerVersion;
            if (isSameVersion) return this.getBinDirPath();
        }

        // Check machine type
        const fileName = this.getOsSpecificFileName();
        // Download compiler
        await this.download(fileName);
        await this.extractZipFile(fileName);
        return this.getBinDirPath();
    }

    async download(fileName: string): Promise<void> {
        const url = `${CAIRO_COMPILER_BINARY_URL}/v${this.compilerVersion}/${fileName}`;
        try {
            const response = await axios.get(url, {
                responseType: "stream",
                onDownloadProgress: (progressEvent) => {
                    const totalLength = progressEvent.total;
                    const downloadedLength = progressEvent.loaded;
                    const percentage = Math.round((downloadedLength / totalLength) * 100);
                    process.stdout.write(
                        `Downloading cairo compiler version: ${this.compilerVersion} ... ${percentage}%\r`
                    );
                }
            });

            const destinationPath = path.join(this.compilerDownloadPath, fileName);

            if (!fs.existsSync(this.compilerDownloadPath)) {
                fs.mkdirSync(this.compilerDownloadPath, { recursive: true });
            }

            const writer = fs.createWriteStream(destinationPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            console.log("\nFile downloaded successfully!");
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError("Error downloading file:", parent);
        }
    }

    async extractZipFile(fileName: FileName): Promise<void> {
        try {
            const zipFile = path.join(this.compilerDownloadPath, fileName);
            const corelibPath = path.join(this.compilerDownloadPath, "target/corelib");
            // Extract the tar/gz file
            await tar.extract({
                file: zipFile,
                C: this.compilerDownloadPath,
                strip: 1
            });
            fs.mkdirSync(this.getBinDirPath(), { recursive: true });
            fs.mkdirSync(corelibPath, { recursive: true });

            if (!this.isDirEmpty(corelibPath) || !this.isDirEmpty(this.getBinDirPath())) {
                fs.rmSync(corelibPath, { recursive: true });
                fs.rmSync(this.getBinDirPath(), { recursive: true });
            }

            // Move contents to correct target
            fs.renameSync(path.join(this.compilerDownloadPath, "corelib"), corelibPath);
            fs.renameSync(path.join(this.compilerDownloadPath, "bin"), this.getBinDirPath());

            // Remove zip file after successfully extracting it
            fs.rmSync(zipFile);
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError("Error extracting tar file:", parent);
        }
    }

    getOsSpecificFileName(): FileName {
        const platform = os.platform();
        switch (platform) {
            case "linux":
                return FileName.LINUX;
            case "darwin":
                return FileName.MACOS;
            default:
                throw new Error(`Unsupported OS: ${platform}.`);
        }
    }

    public getBinDirPath(): string {
        return path.join(this.compilerDownloadPath, "target", "release");
    }

    private isDirEmpty(dirPath: string) {
        const files = fs.readdirSync(dirPath);
        return files.length === 0;
    }
}
