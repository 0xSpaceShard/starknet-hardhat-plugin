import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile("contracts/contract.cairo".split(" "));
hardhatStarknetTest(["test/contract-factory-creation.test.ts", "--no-compile"]);
