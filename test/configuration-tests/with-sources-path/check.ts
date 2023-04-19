import { renameSync } from "fs";
import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertExistence } from "../../utils/utils";

renameSync("contracts", "my-starknet-sources");

// compile without specifying the path to see if the default path is updated to the new value
hardhatStarknetCompileDeprecated([]);

assertExistence("starknet-artifacts/my-starknet-sources");
assertExistence("starknet-artifacts/contracts", false);

hardhatStarknetTest(["test/contract-factory-creation.test.ts", "--no-compile"]);
