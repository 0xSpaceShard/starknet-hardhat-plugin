import { HardhatPluginError } from "hardhat/plugins";
import { PLUGIN_NAME } from "./constants";

export class StarknetPluginError extends HardhatPluginError {
    constructor(message: string, parentError?: Error) {
        super(PLUGIN_NAME, message, parentError);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
