import { ChildProcess } from "child_process";

export abstract class DevnetWrapper {
    protected childProcess: ChildProcess;

    constructor(protected host: string, protected port: string) {}

    protected abstract spawnChildProcess(): Promise<ChildProcess>;

    protected beforeStop?(): Promise<void>;

    public async start(): Promise<void> {
        this.childProcess = await this.spawnChildProcess();

        this.childProcess.stderr.on("data", (data) => {
            console.log(data.toString());
        });

        this.childProcess.stdin.on("data", (data) => {
            console.error(data.toString());
        });

        return new Promise((resolve, reject) => {
            this.childProcess.on("spawn", () => {
                console.log(`Devnet started as a subprocess! ${this.host} ${this.port}`);
                resolve();
            });

            this.childProcess.on("error", (error) => {
                console.error(`Devnet failed to start as a subprocess!`);
                reject(error);
            });
        });
    }

    public async stop() {
        if (!this.childProcess) {
            return;
        }

        await this.beforeStop?.();

        this.childProcess.kill();
    }
}
