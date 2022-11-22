import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompile(["contracts/contract.cairo"]);
    hardhatStarknetTest("--no-compile test/integrated-devnet-args.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
