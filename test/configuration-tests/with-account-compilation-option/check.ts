import { copyFileSync } from "fs";
import path from "path";
import { hardhatStarknetCompileDeprecated } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const contractName = "dummy_account.cairo";
const contractPath = path.join("contracts", contractName);

const expected = "Use the --account-contract flag to compile an account contract.";

console.log("Testing rejection of compilation without the account flag");
copyFileSync(path.join(__dirname, contractName), contractPath);
const execution = hardhatStarknetCompileDeprecated(contractPath.split(" "), true);
assertContains(execution.stderr, expected);
console.log("Success");
hardhatStarknetCompileDeprecated(`${contractPath} --account-contract`.split(" "));
