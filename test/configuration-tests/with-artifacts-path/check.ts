import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertExistence, rmrfSync } from "../../utils/utils";

hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);
assertExistence("my-starknet-artifacts/contracts/contract.cairo/");
assertExistence("starknet-artifacts", false);

hardhatStarknetTest(["test/contract-factory-creation.test.ts", "--no-compile"]);

rmrfSync("my-starknet-artifacts");
