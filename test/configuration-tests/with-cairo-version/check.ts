import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated("contracts/contract.cairo".split(" "));
hardhatStarknetTest(["test/contract-factory-creation.test.ts", "--no-compile"]);
