import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated([]);
hardhatStarknetTest(["test/sample-test.ts", "--no-compile"]);
