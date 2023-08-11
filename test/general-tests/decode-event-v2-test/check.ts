import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["cairo1-contracts/events.cairo", "--add-pythonic-hints", "--single-file"]);
hardhatStarknetTest(["--no-compile test/cairo1/decode-events.test.ts"]);
