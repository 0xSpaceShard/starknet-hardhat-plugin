import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated("contracts/contract.cairo contracts/util.cairo".split(" "));
hardhatStarknetTest("--no-compile test/oz-account-test.ts".split(" "));
hardhatStarknetTest("--no-compile test/argent-account-test.ts".split(" "));
