import { copyFileSync, readFileSync, appendFileSync } from "fs";
import path from "path";
import { hardhatStarknetTest } from "../../utils/cli-functions";
import { assertNotEqual, rmrfSync } from "../../utils/utils";

const prefix = path.join(__dirname);
const contractName = "contract_test_cache.cairo";
const contractPath = path.join("contracts", contractName);

const dependencyName = "dependency.cairo";
const dependencyPath = path.join("contracts", dependencyName);

rmrfSync(dependencyPath);
rmrfSync(contractPath);
// Hardhat test command
console.log("Testing Recompilation with new contract added");
copyFileSync(path.join(prefix, contractName), contractPath);
copyFileSync(path.join(prefix, dependencyName), dependencyPath);

hardhatStarknetTest("--no-compile test/recompilation/recompilation-main-test.ts".split(" "));

console.log("Testing Recompilation with artifacts deleted");
rmrfSync("starknet-artifacts/contracts/contract.cairo");
hardhatStarknetTest("--no-compile test/recompilation/recompilation-main-test.ts".split(" "));

console.log("Testing Recompilation with updated contract");
// Appending a new function to the contract
appendFileSync(
    "contracts/contract_test_cache.cairo",
    readFileSync(path.join(prefix, "get_balance.cairo")).toString()
);
hardhatStarknetTest("--no-compile test/recompilation/recompilation-update-test.ts".split(" "));

console.log("Testing Recompilation with cache file deleted");
rmrfSync("cache/cairo-files-cache.json");
hardhatStarknetTest("--no-compile test/recompilation/recompilation-main-test.ts".split(" "));

console.log("Testing Recompilation with dependency changed");
appendFileSync(dependencyPath, "//");
hardhatStarknetTest("--no-compile test/recompilation/recompilation-dependency-test.ts".split(" "));

console.log("Testing Recompilation with source deleted");
copyFileSync("cache/cairo-files-cache.json", "cache-content-before.json");
rmrfSync("contracts/contract_test_cache.cairo");
hardhatStarknetTest("--no-compile test/recompilation/recompilation-main-test.ts".split(" "));
// Check that the cache file was updated using diff
const cacheContentAfter = readFileSync("cache/cairo-files-cache.json");
const cacheContentBefore = readFileSync("cache-content-before.json");
assertNotEqual(cacheContentAfter, cacheContentBefore, "Cache file was not updated.");

console.log("Testing Recompilation one contract added another deleted");
rmrfSync("contracts/contract_test_cache.cairo");
rmrfSync("contracts/dependency.cairo");

const contractWithNoDependency = "contract_test_cache_no_dependency.cairo";
copyFileSync(path.join(prefix, contractWithNoDependency), contractPath);

hardhatStarknetTest("--no-compile test/recompilation/recompilation-main-test.ts".split(" "));
