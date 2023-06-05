import { hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetTest("--no-compile test/get-predeployed-accounts.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
