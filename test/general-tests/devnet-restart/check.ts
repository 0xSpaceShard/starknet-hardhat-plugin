import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/devnet-restart.test.ts".split(" "));
