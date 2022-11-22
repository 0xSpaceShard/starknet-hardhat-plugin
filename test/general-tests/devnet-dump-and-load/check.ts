import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/devnet-dump-and-load.test.ts".split(" "));
