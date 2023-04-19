import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning, assertContains } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    assertContains(execution.stderr, "Using Cairo VM: Rust");
    await checkDevnetIsNotRunning();
})();
