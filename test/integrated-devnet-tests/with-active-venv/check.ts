import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
    hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    hardhatStarknetTest("--no-compile test/get-predeployed-accounts.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
