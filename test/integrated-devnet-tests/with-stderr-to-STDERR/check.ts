import { readFileSync } from "fs";
import { assertExistence, checkDevnetIsNotRunning, assertContains } from "../../utils/utils";
import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();

    const expectedStdout = "Account #0";
    const expectedWarning =
        "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    assertContains(execution.stderr, expectedWarning);

    // Checks if file logs/stderr.log exists and contains the expected warning string
    assertExistence("logs/stdout.log");
    const stdout = readFileSync("logs/stdout.log", "utf-8");
    assertContains(stdout, expectedStdout);

    console.log("Success");
    await checkDevnetIsNotRunning();
})();
