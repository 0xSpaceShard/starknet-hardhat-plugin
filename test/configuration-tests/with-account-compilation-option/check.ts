import { copyFileSync } from "fs";
import path from "path";
import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const contractName = "dummy_account.cairo";
const contractPath = path.join("contracts", contractName);

const expected = "Use the --account-contract flag to compile an account contract.";

console.log("Testing rejection of compilation without the account flag");
copyFileSync(path.join(__dirname, contractName), contractPath);
const execution = hardhatStarknetCompile(contractPath.split(" "), true);
assertContains(execution.stderr, expected);
console.log("Success");
hardhatStarknetCompile(`${contractPath} --account-contract`.split(" "));
