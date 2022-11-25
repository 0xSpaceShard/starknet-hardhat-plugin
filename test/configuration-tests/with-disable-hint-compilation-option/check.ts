import { copyFileSync } from "fs";
import path from "path";
import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const contractName = "contract_with_unwhitelisted_hints.cairo";
const contractPath = path.join("contracts", contractName);

copyFileSync(path.join(__dirname, contractName), contractPath);

const expected = `Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts.`;

console.log("Testing rejection of compilation without the --disable-hint-validation flag");
const execution = hardhatStarknetCompile([contractPath], true);
assertContains(execution.stderr, expected);
console.log("Success");

hardhatStarknetCompile(`${contractPath} --disable-hint-validation`.split(" "));
