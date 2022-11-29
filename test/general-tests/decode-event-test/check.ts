import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/events.cairo"]);
hardhatStarknetTest("--no-compile test/decode-events.test.ts".split(" "));
