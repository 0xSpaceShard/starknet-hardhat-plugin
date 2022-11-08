import shell from "shelljs";
import { contains, exec } from "../../utils/utils";

const CONTRACT_NAME = "dummy_account.cairo";
const CONTRACT_PATH = "contracts/".concat(CONTRACT_NAME);

const EXPECTED = "Use the --account-contract flag to compile an account contract.";

shell.echo("Testing rejection of compilation without the account flag");
shell.cp(CONTRACT_NAME, CONTRACT_PATH);
contains(`npx hardhat starknet-compile ${CONTRACT_PATH}`, EXPECTED);
shell.echo("Success");

exec(`npx hardhat starknet-compile ${CONTRACT_PATH} --account-contract`);
