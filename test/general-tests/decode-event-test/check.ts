import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated(["contracts/events.cairo"]);
hardhatStarknetTest("--no-compile test/decode-events.test.ts".split(" "));
