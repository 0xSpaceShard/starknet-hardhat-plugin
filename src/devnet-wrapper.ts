import { ChildProcess, spawn } from "child_process";

export class DevnetWrapper {
    private childProcess: ChildProcess;

    constructor(private host: string, private port: string) {}

    public async start() {
        if (this.childProcess && this.childProcess.connected) {
            this.childProcess.disconnect();
        }

        this.childProcess = spawn("starknet-devnet", [`--host`, this.host, `--port`, this.port]);

        return new Promise((resolve, reject) => {
            this.childProcess.on("spawn", () => {
                console.log(`Devnet started as a subprocess! ${this.host} ${this.port}`);
                resolve(true);
            });

            this.childProcess.on("error", (error) => {
                console.error(`Devnet failed to start as a subprocess!`);
                reject(error);
            });
        });
    }

    public stop() {
        if (!this.childProcess) {
            return;
        }

        console.log(`Killing devnet subprocess`);
        this.childProcess.kill();
    }
}
