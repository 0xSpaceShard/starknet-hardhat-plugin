import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
hardhatStarknetTest("--no-compile test/devnet-dump-and-load.test.ts".split(" "));
