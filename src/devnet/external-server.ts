import axios from "axios";
import net from "net";
import { ChildProcess } from "child_process";
import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "../constants";

function sleep(amountMillis: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, amountMillis);
    });
}

export async function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const port = (srv.address() as net.AddressInfo).port;
            srv.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(port);
                }
            });
        });
    });
}

export abstract class ExternalServer {
    protected childProcess: ChildProcess;
    private lastError: string = null;
    private connected = false;

    constructor(
        protected host: string,
        protected port: string,
        private isAliveURL: string,
        private processName: string
    ) {
        ExternalServer.cleanupFns.push(this.cleanup.bind(this));
    }

    public get url() {
        return `http://${this.host}:${this.port}`;
    }

    protected static cleanupFns: Array<() => void> = [];

    public static cleanAll(): void {
        this.cleanupFns.forEach((fn) => fn());
    }

    protected abstract spawnChildProcess(): Promise<ChildProcess>;

    protected abstract cleanup(): void;

    public async start(): Promise<void> {
        if (await this.isServerAlive()) {
            const msg = `Cannot spawn ${this.processName}: ${this.host}:${this.port} already occupied.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }

        this.childProcess = await this.spawnChildProcess();

        // capture the most recent message from stderr
        this.childProcess.stderr.on("data", (chunk) => {
            this.lastError = chunk.toString();
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
                        reject(new HardhatPluginError(PLUGIN_NAME, msg));
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
                    if (this.connected) {
                        const msg = `${this.processName} spawned and connected successfully, but later exited with code=${code}`;
                        throw new HardhatPluginError(PLUGIN_NAME, msg);
                    } else {
                        const msg = `${this.processName} connect exited with code=${code}:\n${this.lastError}`;
                        reject(new HardhatPluginError(PLUGIN_NAME, msg));
                    }
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
        try {
            await axios.get(`${this.url}/${this.isAliveURL}`);
            return true;
        } catch (err: unknown) {
            // cannot connect, so address is not occupied
            return false;
        }
    }
}
