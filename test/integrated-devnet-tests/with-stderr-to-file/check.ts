import { readFileSync } from "fs";
import { assertExistence, checkDevnetIsNotRunning, assertContains } from "../../utils/utils";
import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);

    const expectedStdout = "Account #0";
    const expectedWarning =
        "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

    const output = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    // Checks if output contains the expected string from stdout
    assertContains(output.stdout, expectedStdout);

    // Checks if file logs/stderr.log exists and contains the expected warning string
    assertExistence("logs/stderr.log");
    const stderr = readFileSync("logs/stderr.log", "utf-8");
    assertContains(stderr, expectedWarning);

    console.log("Success");
    await checkDevnetIsNotRunning();
})();
