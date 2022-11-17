import { copyFileSync } from "fs";
import path from "path";
import { contains, exec } from "../../utils/utils";

const CONTRACT_NAME = "dummy_account.cairo";
const CONTRACT_PATH = path.join("contracts", CONTRACT_NAME);

const EXPECTED = "Use the --account-contract flag to compile an account contract.";

console.log("Testing rejection of compilation without the account flag");
copyFileSync(path.join(__dirname, CONTRACT_NAME), CONTRACT_PATH);
contains(`npx hardhat starknet-compile ${CONTRACT_PATH}`, EXPECTED);
console.log("Success");

exec(`npx hardhat starknet-compile ${CONTRACT_PATH} --account-contract`);
