import { copyFileSync } from "fs";
import path from "path";
import { contains } from "../../utils/utils";


const CONTRACT_NAME = "invalid_contract.cairo";
const CONTRACT_PATH = "contracts/".concat(CONTRACT_NAME);

copyFileSync(path.join(__dirname, CONTRACT_NAME), CONTRACT_PATH);

console.log("Testing rejection of compilation with correct message");
contains(`npx hardhat starknet-compile ${CONTRACT_PATH}`, "Unknown identifier 'openzeppelin.token.erc721.library.ERC721.nonexistent_method'");
console.log("Success");
