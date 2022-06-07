import { HardhatRuntimeEnvironment, RunSuperFunction, TaskArguments } from "hardhat/types";

import { createIntegratedDevnet } from "../devnet";

async function runWithDevnet(hre: HardhatRuntimeEnvironment, fn: () => Promise<unknown>) {
    // if (!isStarknetDevnet(hre.starknet.network)) {
    //     await fn();
    //     return;
    // }

    const devnet = createIntegratedDevnet(hre);

    await devnet.start();
    await fn();
    devnet.stop();
}

export async function starknetRunAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<TaskArguments>
) {
    // setRuntimeNetwork(args, hre);

    await runWithDevnet(hre, async () => {
        await runSuper(args);
    });
}
