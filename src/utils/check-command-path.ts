import { StarknetPluginError } from "../starknet-plugin-error";
import fs from "fs";

import { PLUGIN_NAME } from "../constants";

export function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new StarknetPluginError(PLUGIN_NAME, `Command ${commandPath} not found.`);
    }
}
