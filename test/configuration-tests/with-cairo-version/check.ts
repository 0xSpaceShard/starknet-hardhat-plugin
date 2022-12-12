import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile("contracts/contract.cairo".split(" "));
hardhatStarknetTest(["test/contract-factory-test.ts", "--no-compile"]);
