import { ChildProcess, spawn } from "child_process";

import { getPrefixedCommand, normalizeVenvPath } from "../utils/venv";
import { DevnetWrapper } from "./devnet-wrapper";

export class VenvDevnet extends DevnetWrapper {
    private command: string = "starknet-devnet";

    constructor(venvPath: string, host: string, port: string) {
        super(host, port);

        if (venvPath !== "active") {
            this.command = getPrefixedCommand(normalizeVenvPath(venvPath), this.command);
        }
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        return spawn(this.command, ["--host", this.host, "--port", this.port]);
    }
}
