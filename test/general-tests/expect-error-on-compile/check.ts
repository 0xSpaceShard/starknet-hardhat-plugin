import { copyFileSync } from "fs";
import path from "path";
import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const contractName = "invalid_contract.cairo";
const contractPath = path.join("contracts", contractName);

copyFileSync(path.join(__dirname, contractName), contractPath);

console.log("Testing rejection of compilation with correct message");
const compileResult = hardhatStarknetCompile([contractPath], true);
assertContains(
    compileResult.stderr,
    "Unknown identifier 'openzeppelin.token.erc721.library.ERC721.nonexistent_method'"
);
console.log("Success");
