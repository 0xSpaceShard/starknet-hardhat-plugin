import fs, { renameSync, rmSync } from "fs";
import os from "os";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import shell from "shelljs";
import path from "path";
import axios from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CAIRO_COMPILER_BINARY_URL } from "./constants";

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

export class Cairo1CompilerDownloader {
    compilerDownloadPath: string;
    compilerVersion: string;

    constructor(protected hre: HardhatRuntimeEnvironment) {
        this.initialize(hre);
    }

    async initialize(hre: HardhatRuntimeEnvironment) {
        this.compilerVersion =
            hre.config.starknet?.compilerVersion || (await this.getCompilerVersion());
        this.compilerDownloadPath = hre.config.starknet?.cairo1BinDir || "cairo-compiler";
    }

    async handleCompilerDownload(): Promise<void> {
        // Check if binary is installed Install
        const binPath = path.join(this.hre.config.paths.root, this.compilerDownloadPath);
        // Installed =>
        if (fs.existsSync(binPath)) {
            // Warn if version is older
            return;
        }

        // Check machine type
        const fileName = os.platform() === "linux" ? FileName.LINUX : FileName.MACOS;
        await this.download(fileName);
        await this.extractZipFile(fileName);
    }

    async download(fileName: string): Promise<void> {
        const url = `${CAIRO_COMPILER_BINARY_URL}/${this.compilerVersion}/${fileName}`;
        try {
            console.log("Downloading compiler...");
            const response = await axios(url, {
                responseType: "stream"
            });

            const destinationPath = path.join(
                this.compilerDownloadPath,
                `${fileName}-${this.compilerVersion}.tar`
            );

            const writer = fs.createWriteStream(destinationPath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            console.log("File downloaded successfully!");
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError("Error downloading file:", parent);
        }
    }

    async extractZipFile(fileName: FileName): Promise<void> {
        try {
            const zipFile = path.join(this.compilerDownloadPath, fileName);

            // Execute the tar command to extract the tar/gz file
            exec(`tar -xvf ${zipFile} -C ${this.compilerDownloadPath} --strip-components=1`);
            renameSync(
                `${this.compilerDownloadPath}/bin*`,
                `${this.compilerDownloadPath}/target/release/`
            );
            renameSync(
                `${this.compilerDownloadPath}/corelib`,
                `${this.compilerDownloadPath}/corelib`
            );
            // Remove zip file
            rmSync(zipFile);
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError("Error extracting tar file:", parent);
        }
    }

    public async getCompilerVersion(): Promise<string> {
        const config = await import("../config.json");
        return config["CAIRO_COMPILER"];
    }
}
