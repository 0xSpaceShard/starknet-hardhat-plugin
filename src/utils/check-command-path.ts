import { HardhatPluginError } from "hardhat/plugins";
import fs from "fs";

import { PLUGIN_NAME } from "../constants";

export function checkCommandPath(commandPath: string): void {
    if (!fs.existsSync(commandPath)) {
        throw new HardhatPluginError(PLUGIN_NAME, `Command ${commandPath} not found.`);
    }
}
