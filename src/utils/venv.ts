import path from "path";
import { checkCommandPath } from "./check-command-path";

export function normalizeVenvPath(venvPath: string): string {
    if (venvPath[0] === "~") {
        venvPath = path.join(process.env.HOME, venvPath.slice(1));
    }

    return path.normalize(venvPath);
}

export function getPrefixedCommand(venvPath: string, command: string): string {
    const prefixedCommand = path.join(venvPath, "bin", command);

    checkCommandPath(prefixedCommand);

    return prefixedCommand;
}
