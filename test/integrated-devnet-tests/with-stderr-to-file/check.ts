import { existsSync, readFileSync } from "fs";
import { checkDevnetIsNotRunning } from "../../utils/utils";
import { StarknetPluginError } from "../../../src/starknet-plugin-error";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompile(["contracts/contract.cairo"]);

    const expectedStdout = "Account #0";
    const expectedWarning = "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

    const output = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    // Checks if output contains the expected string from stdout
    if (!output.includes(expectedStdout)) {
        throw new StarknetPluginError(`Expected output to contain ${expectedStdout}`);
    }

    // Checks if file logs/stderr.log exists and contains the expected warning string
    if (existsSync("logs/stderr.log")) {
        const stderr = readFileSync("logs/stderr.log", "utf-8");
        if (!stderr.includes(expectedWarning)) {
            throw new StarknetPluginError(`Expected stderr to contain ${expectedWarning}`);
        }
    } else {
        throw new StarknetPluginError("Expected logs/stderr.log to exist");
    }

    console.log("Success");
    await checkDevnetIsNotRunning();
})();
