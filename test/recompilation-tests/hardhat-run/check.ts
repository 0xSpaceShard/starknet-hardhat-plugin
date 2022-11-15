import { rmSync } from "fs";
import { exec } from "../../utils/utils";

// Hardhat run command
console.log("should recompile with deleted artifact on hardhat run");
rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
exec("npx hardhat run --no-compile scripts/deploy.ts");

console.log("should recompile with cache file deleted on hardhat run");
rmSync("cache/cairo-files-cache.json", { recursive: true, force: true });
exec("npx hardhat run --no-compile scripts/deploy.ts");
