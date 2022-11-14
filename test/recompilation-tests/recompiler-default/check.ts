import { rmSync } from "fs";
import { contains } from "../../utils/utils";

const EXPECTED = "StarknetPluginError: Artifact expected to be at";

console.log("Testing with deleted artifact on recompiler option set to default (off)");
rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
contains("npx hardhat run --no-compile scripts/deploy.ts", EXPECTED);
