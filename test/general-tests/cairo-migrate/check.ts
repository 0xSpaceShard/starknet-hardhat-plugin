import { copyFileSync, readFileSync } from "fs";
import path from "path";
import { hardhatStarknetMigrate } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const contractName = "old_contract.cairo";
const contractPath = path.join("contracts", contractName);
const newComment = "// Declare this file as a Starknet contract.";

copyFileSync(path.join(__dirname, contractName), contractPath);

console.log("Testing migration of old cairo contract to a new one");
// Migrate contract to new version.
const execution = hardhatStarknetMigrate([contractPath]);
assertContains(execution.stdout, newComment);

// Migrate contract to new version with change content in place option.
hardhatStarknetMigrate(`${contractPath} --inplace`.split(" "));
assertContains(readFileSync(contractPath).toString(), newComment);

console.log("Success");
