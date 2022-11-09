import shell from "shelljs";
import { contains, exec } from "../../utils/utils";

const CONTRACT_NAME = "contract_with_unwhitelisted_hints.cairo";
const CONTRACT_PATH = "contracts/".concat(CONTRACT_NAME);

exec(`cp $(dirname "$0")/${CONTRACT_NAME} ${CONTRACT_PATH}`);

const EXPECTED = `Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts.`;

shell.echo("Testing rejection of compilation without the --disable-hint-validation flag");
contains(`npx hardhat starknet-compile ${CONTRACT_PATH}`, EXPECTED);
shell.echo("Success");

exec(`npx hardhat starknet-compile ${CONTRACT_PATH} --disable-hint-validation`);
