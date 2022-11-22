import { hardhatStarknetRun } from "../../utils/cli-functions";
import { rmrfSync } from "../../utils/utils";

// Hardhat run command
console.log("should recompile with deleted artifact on hardhat run");
rmrfSync("starknet-artifacts/contracts/contract.cairo");
hardhatStarknetRun("--no-compile scripts/deploy.ts".split(" "));

console.log("should recompile with cache file deleted on hardhat run");
rmrfSync("cache/cairo-files-cache.json");
hardhatStarknetRun("--no-compile scripts/deploy.ts".split(" "));
