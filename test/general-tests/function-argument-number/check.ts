import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/function-args-test.ts".split(" "));
