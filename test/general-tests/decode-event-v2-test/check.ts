import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_DIR");
hardhatStarknetCompile(["cairo1-contracts/events.cairo", "--add-pythonic-hints", "--single-file"]);
hardhatStarknetTest(["--no-compile test/cairo1/decode-events.test.ts"]);
