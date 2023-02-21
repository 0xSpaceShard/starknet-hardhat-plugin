import { ChildProcess, spawn } from "child_process";

import { getPrefixedCommand, normalizeVenvPath } from "../utils/venv";
import { ExternalServer } from "./external-server";

export class VenvDevnet extends ExternalServer {
    private command: string;
    private args?: string[];
    private vmLang?: string;

    constructor(
        venvPath: string,
        host: string,
        port: string,
        args?: string[],
        stdout?: string,
        stderr?: string,
        vmLang?: string
    ) {
        super(host, port, "is_alive", "integrated-devnet", stdout, stderr);

        this.command = "starknet-devnet";
        this.args = args;
        this.vmLang = vmLang;

        if (venvPath !== "active") {
            this.command = getPrefixedCommand(normalizeVenvPath(venvPath), this.command);
        }
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        const args = ["--host", this.host, "--port", this.port].concat(this.args || []);
        const options = { env: { PATH: process.env.PATH, STARKNET_DEVNET_CAIRO_VM: this.vmLang } };
        return spawn(this.command, args, options);
    }

    protected cleanup(): void {
        this.childProcess?.kill();
    }
}
