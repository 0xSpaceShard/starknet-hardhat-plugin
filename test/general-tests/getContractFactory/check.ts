import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated([]);
hardhatStarknetTest("--no-compile test/path-test.ts".split(" "));
