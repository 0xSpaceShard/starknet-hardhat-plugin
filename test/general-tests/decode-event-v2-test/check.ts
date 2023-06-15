import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["cairo1-contracts/events.cairo", "--add-pythonic-hints"]);
hardhatStarknetTest(["--no-compile test/cairo1/decode-events.test.ts"]);
