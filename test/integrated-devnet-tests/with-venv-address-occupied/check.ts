import { spawn } from "child_process";
import { checkDevnetIsNotRunning, contains } from "../../utils/utils";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

(async () => {
    await checkDevnetIsNotRunning();

    const result = spawn("starknet-devnet", "--host 127.0.0.1 --port 5050 --accounts 0".split(" "), { detached: true });
    hardhatStarknetCompile(["contracts/contract.cairo"]);
    const execution = hardhatStarknetTest("--no-compile test/integrated-devnet.test.ts".split(" "), true);
    contains(execution.stderr, "127.0.0.1:5050 already occupied.");
    result.kill();

    await checkDevnetIsNotRunning();
})();
