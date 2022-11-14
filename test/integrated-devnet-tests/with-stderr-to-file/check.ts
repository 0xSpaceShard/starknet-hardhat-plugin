import shell from "shelljs";
import { existsSync, readFileSync } from "fs";
import { checkDevnetIsNotRunning, exec } from "../../utils/utils";

checkDevnetIsNotRunning();

exec("npx hardhat starknet-compile contracts/contract.cairo");

const EXPECTED_STDOUT = "Account #0";
const EXPECTED_WARNING = "WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS.";

const output = exec("npx hardhat test --no-compile test/integrated-devnet.test.ts");
// Checks if output contains the expected string from stdout
if (!output.includes(EXPECTED_STDOUT)) {
    console.log(`Expected output to contain ${EXPECTED_STDOUT}`);
    shell.exit(1);
}

// Checks if file logs/stderr.log exists and contains the expected warning string
if (existsSync("logs/stderr.log")) {
    const stderr = readFileSync("logs/stderr.log", "utf-8");
    if (!stderr.includes(EXPECTED_WARNING)) {
        console.error(`Expected stderr to contain ${EXPECTED_WARNING}`);
        shell.exit(1);
    }
} else {
    console.log("Expected logs/stderr.log to exist");
}

console.log("Success");
checkDevnetIsNotRunning();
