import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning, assertContains } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest(
        "--no-compile test/integrated-devnet.test.ts".split(" "),
        true
    );
    assertContains(
        execution.stderr,
        "starknet-devnet: error: --accounts must be a positive integer; got: invalid_value."
    );
    await checkDevnetIsNotRunning();
})();
