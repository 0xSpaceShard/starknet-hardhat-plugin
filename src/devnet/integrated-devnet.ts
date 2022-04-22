import { ChildProcess } from "child_process";

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
            this.childProcess.on("spawn", () => {
                setTimeout(resolve, 1000);
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
