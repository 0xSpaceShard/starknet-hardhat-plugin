import { ChildProcess, spawn } from "child_process";

import { DevnetWrapper } from "./devnet-wrapper";

export class VenvDevnet extends DevnetWrapper {
    constructor(host: string, port: string) {
        super(host, port);
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        return spawn("starknet-devnet", ["--host", this.host, "--port", this.port]);
    }
}
