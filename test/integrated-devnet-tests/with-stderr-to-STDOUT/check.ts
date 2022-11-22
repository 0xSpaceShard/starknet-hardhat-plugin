import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning, contains } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompile(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "), true);
    contains(execution.stderr, "starknet-devnet: error: --accounts must be a positive integer; got: invalid_value.");

    await checkDevnetIsNotRunning();
})();
