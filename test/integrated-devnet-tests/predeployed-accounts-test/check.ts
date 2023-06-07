import { hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning } from "../../utils/utils";

// Tests race condition on proxy server by making multiple calls to the
// function getAccountFromAddress and that the proxy server
// handles simultaneous requests correctly and that the port assignment
// on the integrated-devnet environment is implemented correctly
(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetTest("--no-compile test/get-predeployed-accounts.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
