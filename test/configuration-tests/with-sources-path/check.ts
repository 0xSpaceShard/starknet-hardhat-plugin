import { renameSync } from "fs";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertExistence } from "../../utils/utils";

renameSync("contracts", "my-starknet-sources");

hardhatStarknetCompile(["contracts/contract.cairo"]);
assertExistence("starknet-artifacts/my-starknet-sources");
assertExistence("starknet-artifacts/contracts", false);

hardhatStarknetTest(["test/contract-factory-test.ts", "--no-compile"]);
