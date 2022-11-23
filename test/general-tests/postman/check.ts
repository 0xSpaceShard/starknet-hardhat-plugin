import { exec } from "../../utils/utils";
import { spawn } from "child_process";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/l1l2.cairo"]);

spawn("npx", ["hardhat", "node"], { detached: true });
exec("sleep 1");

hardhatStarknetTest("--network localhost test/postman.test.ts".split(" "));
exec("kill -9 $(lsof -t -i:8545)");
