import shell from "shelljs";
import { existsSync, readFileSync } from "fs";
import { checkDevnetIsNotRunning, contains, exec } from "../../utils/utils";

checkDevnetIsNotRunning();


const EXPECTED_STDOUT = "Account #0";
const EXPECTED_WARNING = "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

exec("npx hardhat starknet-compile contracts/contract.cairo");
contains("npx hardhat test --no-compile test/integrated-devnet.test.ts", EXPECTED_WARNING);

// Checks if file logs/stderr.log exists and contains the expected warning string
if (existsSync("logs/stdout.log")) {
    const stdout = readFileSync("logs/stdout.log", "utf-8");
    if (!stdout.includes(EXPECTED_STDOUT)) {
        console.error(`Expected stderr to contain ${EXPECTED_STDOUT}`);
        shell.exit(1);
    }
} else {
    console.log("Expected logs/stdout.log to exist");
}

console.log("Success");
checkDevnetIsNotRunning();
