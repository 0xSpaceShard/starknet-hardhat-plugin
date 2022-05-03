import { ChildProcess, spawn } from "child_process";

import { getPrefixedCommand, normalizeVenvPath } from "../utils/venv";
import { IntegratedDevnet } from "./integrated-devnet";

export class VenvDevnet extends IntegratedDevnet {
    private command: string;

    constructor(venvPath: string, host: string, port: string) {
        super(host, port);

        this.command = "starknet-devnet";

        if (venvPath !== "active") {
            this.command = getPrefixedCommand(normalizeVenvPath(venvPath), this.command);
        }
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        return spawn(this.command, ["--host", this.host, "--port", this.port]);
    }

    protected cleanup(): void {
        this.childProcess?.kill();
    }
}
