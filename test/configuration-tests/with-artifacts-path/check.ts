import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertExistence, rmrfSync } from "../../utils/utils";

hardhatStarknetCompile(["contracts/contract.cairo"]);
assertExistence("my-starknet-artifacts/contracts/contract.cairo/");
assertExistence("starknet-artifacts", false);

hardhatStarknetTest(["test/contract-factory-test.ts", "--no-compile"]);

rmrfSync("my-starknet-artifacts");
