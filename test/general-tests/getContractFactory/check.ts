import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile([]);
hardhatStarknetTest("--no-compile test/path-test.ts".split(" "));
