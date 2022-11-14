import { rmSync, copyFileSync, readFileSync } from "fs";
import path from "path";
import shell from "shelljs";
import { exec } from "../../utils/utils";

const PREFIX = path.join(__dirname);
const CONTRACT_NAME = "contract_test_cache.cairo";
const CONTRACT_PATH = path.join("contracts", CONTRACT_NAME);

const DEPENDENCY_NAME = "dependency.cairo";
const DEPENDENCY_PATH = path.join("contracts", DEPENDENCY_NAME);

rmSync(DEPENDENCY_PATH, { recursive: true, force: true });
rmSync(CONTRACT_PATH, { recursive: true, force: true });
// Hardhat test command
console.log("Testing Recompilation with new contract added");
copyFileSync(path.join(PREFIX, CONTRACT_NAME), CONTRACT_PATH);
copyFileSync(path.join(PREFIX, DEPENDENCY_NAME), DEPENDENCY_PATH);

exec("npx hardhat test --no-compile test/recompilation/recompilation-main-test.ts");

console.log("Testing Recompilation with artifacts deleted");
rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
exec("npx hardhat test --no-compile test/recompilation/recompilation-main-test.ts");

console.log("Testing Recompilation with updated contract");
// Appending a new function to the contract
exec(`cat ${path.join(PREFIX, "get_balance.cairo")} >> contracts/contract_test_cache.cairo`);
exec("npx hardhat test --no-compile test/recompilation/recompilation-update-test.ts");

console.log("Testing Recompilation with cache file deleted");
rmSync("cache/cairo-files-cache.json", { recursive: true, force: true });
exec("npx hardhat test --no-compile test/recompilation/recompilation-main-test.ts");

console.log("Testing Recompilation with dependency changed");
exec(`echo "//" >> ${DEPENDENCY_PATH}`);
exec("npx hardhat test --no-compile test/recompilation/recompilation-dependency-test.ts");

console.log("Testing Recompilation with source deleted");
copyFileSync("cache/cairo-files-cache.json", "cache-content-before.json");
rmSync("contracts/contract_test_cache.cairo", { recursive: true, force: true });
exec("npx hardhat test --no-compile test/recompilation/recompilation-main-test.ts");
// Check that the cache file was updated using diff
const cacheContentAfter = readFileSync("cache/cairo-files-cache.json");
const cacheContentBefore = readFileSync("cache-content-before.json");
if (cacheContentAfter.equals(cacheContentBefore)) {
    console.log("Cache file was not updated");
    shell.exit(1);
}

console.log("Testing Recompilation one contract added another deleted");
rmSync("contracts/contract_test_cache.cairo", { force: true });
rmSync("contracts/dependency.cairo", { force: true });

const CONTRACT_WITH_NO_DEPENDENCY = "contract_test_cache_no_dependency.cairo";
copyFileSync(path.join(PREFIX, CONTRACT_WITH_NO_DEPENDENCY), CONTRACT_PATH);

exec("npx hardhat test --no-compile test/recompilation/recompilation-main-test.ts");
