import { ChildProcess, spawn } from "child_process";
import { ExternalServer } from "./devnet/external-server";
import path from "path";

export class StarknetVenvProxy extends ExternalServer {
    constructor(private started = false) {
        super("127.0.0.1", "8080", "", "starknet-venv-proxy");
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        const proxyServerPath = path.join(__dirname, "starknet_cli_wrapper.py");
        return spawn("python", [proxyServerPath, this.port]);
    }

    public async ensureStarted(): Promise<void> {
        if (this.started) {
            return;
        }
        await this.start();
        this.started = true;
    }

    protected cleanup(): void {
        this.childProcess?.kill();
    }
}
