import { rmSync } from "fs";
import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

// Hardhat starknet-deploy command
console.log("Testing Recompilation with deleted artifact on starknet-deploy");
rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} starknet-artifacts/contracts/contract.cairo/ --inputs 10`);
