import axios from "axios";
import { ChildProcess } from "child_process";

function sleep(amountMillis: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, amountMillis);
    });
}

const DEVNET_ALIVE_URL = "is_alive";

export abstract class IntegratedDevnet {
    protected childProcess: ChildProcess;

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
        this.childProcess = await this.spawnChildProcess();

        return new Promise((resolve, reject) => {
            this.childProcess.on("spawn", async () => {
                const maxWaitMillis = 60_000;
                const oneSleepMillis = 500;
                const maxIterations = maxWaitMillis / oneSleepMillis;
                for (let i = 0; i < maxIterations; ++i) {
                    await sleep(oneSleepMillis);
                    try {
                        await axios.get(`http://${this.host}:${this.port}/${DEVNET_ALIVE_URL}`);
                        resolve();
                    } catch (err: unknown) {
                        // cannot connect yet, devnet is not up
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
}
