import fs from "node:fs";
import path from "node:path";

import { StarknetPluginError } from "../starknet-plugin-error";

export function normalizeVenvPath(venvPath: string): string {
    if (venvPath[0] === "~") {
        venvPath = path.join(process.env.HOME, venvPath.slice(1));
    }

    return path.normalize(venvPath);
}

export function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new StarknetPluginError(`Command ${commandPath} not found.`);
    }
}

export function getPrefixedCommand(venvPath: string, command: string): string {
    const prefixedCommand = path.join(venvPath, "bin", command);

    checkCommandPath(prefixedCommand);

    return prefixedCommand;
}
