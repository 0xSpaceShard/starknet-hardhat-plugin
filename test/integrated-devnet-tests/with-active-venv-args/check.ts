import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
    process.env.EXPECTED_GAS_PRICE = "2000000000";
    hardhatStarknetTest("--no-compile test/integrated-devnet-args.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
