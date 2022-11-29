import { spawn } from "child_process";
import { checkDevnetIsNotRunning, assertContains } from "../../utils/utils";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();
    // run devnet which will cause integrated-devnet to fail
    const result = spawn(
        "starknet-devnet",
        "--host 127.0.0.1 --port 5050 --accounts 0".split(" "),
        { detached: true }
    );
    hardhatStarknetCompile(["contracts/contract.cairo"]);

    const execution = hardhatStarknetTest(
        "--no-compile test/integrated-devnet.test.ts".split(" "),
        true
    );
    assertContains(execution.stderr, "127.0.0.1:5050 already occupied.");
    result.kill();

    await checkDevnetIsNotRunning();
})();
