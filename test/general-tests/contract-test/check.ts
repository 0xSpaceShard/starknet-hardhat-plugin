import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile("contracts/contract.cairo contracts/util.cairo".split(" "));
hardhatStarknetTest("--no-compile test/contract.test.ts".split(" "));
hardhatStarknetTest("--no-compile test/contract-factory.test.ts".split(" "));
