import path from "path";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { checkDevnetIsNotRunning, exec } from "../../utils/utils";

exec(`bash ${path.join(__dirname, "venv.sh")}`);
(async () => {
    await checkDevnetIsNotRunning();
    hardhatStarknetCompile(["contracts/contract.cairo"]);
    hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "));
    await checkDevnetIsNotRunning();
})();
