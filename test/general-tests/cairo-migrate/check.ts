import { copyFileSync } from "fs";
import path from "path";
import { contains, exec } from "../../utils/utils";

const CONTRACT_NAME = "old_contract.cairo";
const CONTRACT_PATH = path.join("contracts", CONTRACT_NAME);
const NEW_COMMENT = "// Declare this file as a StarkNet contract.";

copyFileSync(path.join(__dirname, CONTRACT_NAME), CONTRACT_PATH);

console.log("Testing migration of old cairo contract to a new one");
// Migrate contract to new version.
contains(`npx hardhat migrate ${CONTRACT_PATH}`, NEW_COMMENT, "stdout");

// Migrate contract to new version with change content in place option.
exec(`npx hardhat migrate ${CONTRACT_PATH} --inplace`);
contains(`cat ${CONTRACT_PATH}`, NEW_COMMENT, "stdout");

console.log("Success");
