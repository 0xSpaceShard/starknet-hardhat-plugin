import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/function-args-test.ts".split(" "));
