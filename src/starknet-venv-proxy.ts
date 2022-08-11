import { ChildProcess, spawn } from "child_process";
import { ExternalServer, getFreePort } from "./devnet/external-server";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import axios from "axios";
import path from "path";

export class StarknetVenvProxy extends ExternalServer {
    private started = false;

    constructor(private pythonPath: string) {
        super("127.0.0.1", null, "", "starknet-venv-proxy");
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        this.port = await getFreePort();
        const proxyServerPath = path.join(__dirname, "starknet_cli_wrapper.py");
        return spawn(this.pythonPath, [proxyServerPath, this.port]);
    }

    public async post(args: string[]): Promise<ProcessResult> {
        await this.ensureStarted();
        const payload = { args };
        const response = await axios.post<ProcessResult>(this.url, payload);
        return response.data;
    }

    private async ensureStarted(): Promise<void> {
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
