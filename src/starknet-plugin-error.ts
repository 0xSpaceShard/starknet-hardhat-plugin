import { HardhatPluginError } from "hardhat/plugins";

export class StarknetPluginError extends HardhatPluginError {

    constructor(pluginName: string, message: string, parentError?: Error) {
        super(pluginName, message, parentError);
    }
}
