import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_DIR");
hardhatStarknetCompile(["cairo1-contracts/contract1.cairo", "--single-file"]);
hardhatStarknetTest(["--no-compile test/cairo1/declare-v2.test.ts"]);
