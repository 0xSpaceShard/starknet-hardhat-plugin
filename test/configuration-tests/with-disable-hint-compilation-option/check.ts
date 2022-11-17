import { copyFileSync } from "fs";
import path from "path";
import { contains, exec } from "../../utils/utils";

const CONTRACT_NAME = "contract_with_unwhitelisted_hints.cairo";
const CONTRACT_PATH = path.join("contracts", CONTRACT_NAME);

copyFileSync(path.join(__dirname, CONTRACT_NAME), CONTRACT_PATH);

const EXPECTED = `Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts.`;

console.log("Testing rejection of compilation without the --disable-hint-validation flag");
contains(`npx hardhat starknet-compile ${CONTRACT_PATH}`, EXPECTED);
console.log("Success");

exec(`npx hardhat starknet-compile ${CONTRACT_PATH} --disable-hint-validation`);
