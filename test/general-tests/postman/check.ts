import { exec } from "../../utils/utils";
import { spawn } from "child_process";
import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { NODE_PORT } from "../../constants/constants";

hardhatStarknetCompileDeprecated(["contracts/l1l2.cairo"]);

spawn("npx", ["hardhat", "node", "--port", NODE_PORT], { detached: true });
exec("sleep 1");

hardhatStarknetTest("--network localhost test/postman.test.ts".split(" "));
exec(`kill -9 $(lsof -t -i:${NODE_PORT})`);
