import { hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

// Test how full image specification is handled

(async () => {
    // no danger in using a devnet to whose API we are not adapted (latest)
    // as this test only relies on /is_alive
    for (const devnetVersion of [
        "shardlabs/starknet-devnet:latest",
        "shardlabs/starknet-devnet-rs:latest"
    ]) {
        await checkDevnetIsNotRunning();
        process.env.STARKNET_DEVNET = devnetVersion;
        hardhatStarknetTest([
            "--no-compile",
            "test/integrated-devnet.test.ts",
            // run just the one test from the file
            "--grep",
            "\"should have devnet endpoint alive\""
        ]);
    }

    await checkDevnetIsNotRunning();
})();
