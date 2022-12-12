import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile([]);
hardhatStarknetTest(["test/sample-test.ts", "--no-compile"]);
