import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/transaction-trace-test.ts".split(" "));
