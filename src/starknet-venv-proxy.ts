import { ChildProcess, spawn } from "child_process";
import { ExternalServer } from "./external-server";
import { getFreePort } from "./external-server/external-server";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import path from "path";

export class StarknetVenvProxy extends ExternalServer {
    constructor(private pythonPath: string, hre: HardhatRuntimeEnvironment) {
        super("127.0.0.1", null, "", "starknet-venv-proxy", hre);
    }

    protected async spawnChildProcess(): Promise<ChildProcess> {
        this.port = await getFreePort();
        const proxyServerPath = path.join(__dirname, "starknet_cli_wrapper.py");
        return spawn(this.pythonPath, [proxyServerPath, this.port]);
    }

    protected cleanup(): void {
        this.childProcess?.kill();
    }
}
