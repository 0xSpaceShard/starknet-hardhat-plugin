import axios from "axios";
import net from "net";
import { ChildProcess, spawnSync, CommonSpawnOptions } from "child_process";
import { StarknetPluginError } from "../starknet-plugin-error";
import { IntegratedDevnetLogger } from "./integrated-devnet-logger";
import { StringMap } from "../types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

function sleep(amountMillis: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, amountMillis);
    });
}

function isFreePort(port: number): Promise<boolean> {
    return new Promise((accept, reject) => {
        const sock = net.createConnection(port);
        sock.once("connect", () => {
            sock.end();
            accept(false);
        });
        sock.once("error", (e: NodeJS.ErrnoException) => {
            sock.destroy();
            if (e.code === "ECONNREFUSED") {
                accept(true);
            } else {
                reject(e);
            }
        });
    });
}

export async function getFreePort(): Promise<string> {
    const defaultDevnetPort = 5050; // starting here to avoid conflicts
    const step = 1000;
    const maxPort = 65535;
    for (let port = defaultDevnetPort + step; port <= maxPort; port += step) {
        if (await isFreePort(port)) {
            return port.toString();
        }
    }

    throw new StarknetPluginError("Could not find a free port, try rerunning your command!");
}

export abstract class ExternalServer {
    protected childProcess: ChildProcess;
    private connected = false;
    private lastError: string = null;
    private _isDockerDesktop: boolean = null;

    constructor(
        protected host: string,
        protected port: string | null,
        private isAliveURL: string,
        protected processName: string,
        protected stdout?: string,
        protected stderr?: string
    ) {
        ExternalServer.cleanupFns.push(this.cleanup.bind(this));
    }

    public get isDockerDesktop(): boolean {
        if (this._isDockerDesktop === null) {
            this._isDockerDesktop = this.getIsDockerDesktop();
        }
        return this._isDockerDesktop;
    }

    /**
     * Check if docker is Docker Desktop
     */
    private getIsDockerDesktop(): boolean {
        const res = spawnSync("docker", ["system", "info"], { encoding: "utf8" });
        //stdout is null when docker command doesn't exists
        return res.stdout?.includes("Operating System: Docker Desktop");
    }

    public get url() {
        return `http://${this.host}:${this.port}`;
    }

    protected static cleanupFns: Array<() => void> = [];

    public static cleanAll(): void {
        this.cleanupFns.forEach((fn) => fn());
    }

    protected abstract spawnChildProcess(options?: CommonSpawnOptions): Promise<ChildProcess>;

    protected abstract cleanup(): void;

    public async start(): Promise<void> {
        if (await this.isServerAlive()) {
            const msg = `Cannot spawn ${this.processName}: ${this.url} already occupied.`;
            throw new StarknetPluginError(msg);
        }

        this.childProcess = await this.spawnChildProcess();
        const logger = new IntegratedDevnetLogger(this.stdout, this.stderr);
        this.childProcess.stdout.on("data", async (chunk) => {
            chunk = chunk.toString();
            await logger.logHandler(this.stdout, chunk);
        });

        // capture the most recent message from stderr
        this.childProcess.stderr.on("data", async (chunk) => {
            chunk = chunk.toString();
            await logger.logHandler(this.stderr, chunk);
            this.lastError = chunk;
        });

        return new Promise((resolve, reject) => {
            // called on successful start of the child process
            this.childProcess.on("spawn", async () => {
                const startTime = new Date().getTime();
                const maxWaitMillis = 60_000;
                const oneSleepMillis = 500;

                // keep checking until process has failed/exited
                while (this.childProcess) {
                    const elapsedMillis = new Date().getTime() - startTime;
                    if (elapsedMillis >= maxWaitMillis) {
                        const msg = `${this.processName} connection timed out!`;
                        reject(new StarknetPluginError(msg));
                        break;
                    } else if (await this.isServerAlive()) {
                        this.connected = true;
                        resolve();
                        break;
                    } else {
                        await sleep(oneSleepMillis);
                    }
                }
            });

            // this only happens if childProcess completely fails to start
            this.childProcess.on("error", (error) => {
                this.childProcess = null;
                reject(error);
            });

            // handle unexpected close of process
            this.childProcess.on("close", (code) => {
                const isAbnormalExit = this.childProcess != null;
                this.childProcess = null;
                if (code !== 0 && isAbnormalExit) {
                    const circumstance = this.connected ? "running" : "connecting";
                    const moreInfo = logger.isFile(this.stderr)
                        ? "More error info in " + this.stderr
                        : "";
                    const msg = `${this.processName} exited with code=${code} while ${circumstance}. ${this.lastError}\n${moreInfo}`;
                    throw new StarknetPluginError(msg);
                }
            });
        });
    }

    public stop() {
        if (!this.childProcess) {
            return;
        }

        this.cleanup();
        this.childProcess = null;
    }

    private async isServerAlive() {
        if (this.port === null) return false;
        try {
            await axios.get(`${this.url}/${this.isAliveURL}`);
            return true;
        } catch (err: unknown) {
            // cannot connect, so address is not occupied
            return false;
        }
    }

    public async post<T>(data: StringMap): Promise<T> {
        await this.ensureStarted();

        const hre: HardhatRuntimeEnvironment = await import("hardhat");

        try {
            const response = await axios.post<T>(this.url, data, {
                timeout: hre.config.starknet.requestTimeout
            });
            return response.data;
        } catch (error) {
            const parent = error instanceof Error && error;
            const msg = `Error in interaction with Starknet CLI proxy server\n${error}`;
            throw new StarknetPluginError(msg, parent);
        }
    }

    private async ensureStarted(): Promise<void> {
        if (this.connected) {
            return;
        }
        await this.start();
    }
}
