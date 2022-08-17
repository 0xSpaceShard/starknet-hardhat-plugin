import { StarknetPluginError } from "../starknet-plugin-error";
import fs from "fs";

export function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new StarknetPluginError(`Command ${commandPath} not found.`);
    }
}
