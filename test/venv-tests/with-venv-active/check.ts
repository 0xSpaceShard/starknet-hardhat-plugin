import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile([]);
hardhatStarknetTest(["test/contract-factory-test.ts", "--no-compile"]);
