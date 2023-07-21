import fs from "fs";
import os from "os";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import path from "path";
import axios from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import { CAIRO_COMPILER_BINARY_URL } from "./constants";
import { StarknetConfig } from "./types/starknet";

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
    private isInitialized: Promise<void>;
    compilerDownloadPath: string;
    compilerVersion: string;

    constructor(rootPath: string, starknet: StarknetConfig) {
        this.isInitialized = this.initialize(rootPath, starknet);
    }

    async initialize(rootPath: string, starknet: StarknetConfig) {
        this.compilerDownloadPath = starknet?.cairo1BinDir || path.join(rootPath, "cairo-compiler");
        this.compilerVersion = starknet?.compilerVersion || (await this.getCompilerVersion());
    }

    async handleCompilerDownload(): Promise<void> {
        await this.isInitialized;
        if (fs.existsSync(this.getBinDirPath())) {
            // Checks if installed binary version is same as version set on hardhat config file
            const isSameVersion = exec(`${this.getBinDirPath()}/starknet-compile --version`)
                .stderr.toString()
                .includes(this.compilerVersion);
            if (isSameVersion) return;
        }

        // Check machine type
        const fileName = os.platform() === "linux" ? FileName.LINUX : FileName.MACOS;
        // Download compiler
        await this.download(fileName);
        await this.extractZipFile(fileName);
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
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(
                        `Downloading cairo compiler version: ${this.compilerVersion} ... ${percentage}%`
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
            // Execute the tar command to extract the tar/gz file
            exec(`tar -xvf ${zipFile} -C ${this.compilerDownloadPath} --strip-components=1`);
            fs.mkdirSync(this.getBinDirPath(), { recursive: true });
            fs.mkdirSync(corelibPath, { recursive: true });

            if (!this.isDirEmpty(corelibPath) || !this.isDirEmpty(this.getBinDirPath())) {
                fs.rmSync(corelibPath, { recursive: true });
                fs.rmSync(this.getBinDirPath(), { recursive: true });
            }

            // Move contents to correct target
            fs.renameSync(path.join(this.compilerDownloadPath, "corelib"), corelibPath);
            fs.renameSync(path.join(this.compilerDownloadPath, "bin"), this.getBinDirPath());

            // maybe remove zip file after extracting it?
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError("Error extracting tar file:", parent);
        }
    }

    public async getCompilerVersion(): Promise<string> {
        const config = await import("../config.json");
        return config["CAIRO_COMPILER"];
    }

    public getBinDirPath(): string {
        return path.join(this.compilerDownloadPath, "target/release");
    }

    public isDirEmpty(dirPath: string): boolean {
        const files = fs.readdirSync(dirPath);
        return files.length === 0;
    }
}
