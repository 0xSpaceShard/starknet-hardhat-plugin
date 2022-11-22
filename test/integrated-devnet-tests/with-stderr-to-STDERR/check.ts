import { existsSync, readFileSync } from "fs";
import { checkDevnetIsNotRunning, contains } from "../../utils/utils";
import { StarknetPluginError } from "../../../src/starknet-plugin-error";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();

    const expectedStdout = "Account #0";
    const expectedWarning = "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

    hardhatStarknetCompile(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "), true);
    contains(execution.stderr, expectedWarning);

    // Checks if file logs/stderr.log exists and contains the expected warning string
    if (existsSync("logs/stdout.log")) {
        const stdout = readFileSync("logs/stdout.log", "utf-8");
        if (!stdout.includes(expectedStdout)) {
            throw new StarknetPluginError(`Expected stderr to contain ${expectedStdout}`);
        }
    } else {
        throw new StarknetPluginError("Expected logs/stdout.log to exist");
    }

    console.log("Success");
    await checkDevnetIsNotRunning();
})();
