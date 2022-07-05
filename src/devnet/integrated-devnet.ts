import axios from "axios";
import { ChildProcess } from "child_process";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "../constants";

function sleep(amountMillis: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, amountMillis);
    });
}

export abstract class IntegratedDevnet {
    protected childProcess: ChildProcess;
    private stderr = "";

    constructor(protected host: string, protected port: string) {
        IntegratedDevnet.cleanupFns.push(this.cleanup.bind(this));
    }

    protected static cleanupFns: Array<() => void> = [];

    public static cleanAll(): void {
        this.cleanupFns.forEach((fn) => fn());
    }

    protected abstract spawnChildProcess(): Promise<ChildProcess>;

    protected abstract cleanup(): void;

    public async start(): Promise<void> {
        if (await this.isAddressOccupied()) {
            const msg = `Cannot spawn integrated-devnet: ${this.host}:${this.port} already occupied.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        this.childProcess = await this.spawnChildProcess();

        this.childProcess.stderr.on("data", (chunk) => (this.stderr += chunk.toString()));

        this.childProcess.on("close", (code) => {
            if (code !== 0) {
                const msg = `Integrated devnet exited with code ${code}.\n${this.stderr}`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }
        });

        return new Promise((resolve, reject) => {
            this.childProcess.on("spawn", async () => {
                const maxWaitMillis = 60_000;
                const oneSleepMillis = 500;
                const maxIterations = maxWaitMillis / oneSleepMillis;
                for (let i = 0; i < maxIterations; ++i) {
                    await sleep(oneSleepMillis);
                    if (await this.isAddressOccupied()) {
                        resolve();
                    }
                }
                reject(`Could not connect to integrated-devnet in ${maxWaitMillis} ms!`);
            });

            this.childProcess.on("error", (error) => {
                reject(error);
            });
        });
    }

    public stop() {
        if (!this.childProcess) {
            return;
        }

        this.cleanup();
    }

    private async isAddressOccupied() {
        try {
            await axios.get(`http://${this.host}:${this.port}/is_alive`);
            return true;
        } catch (err: unknown) {
            // cannot connect yet, devnet is not up
            return false;
        }
    }
}
