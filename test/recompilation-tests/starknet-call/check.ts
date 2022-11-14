import { rmSync } from "fs";
import { extractAddress, exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

console.log("Testing Recompilation with deleted artifact on starknet-call");
const output = exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} starknet-artifacts/contracts/contract.cairo/ --inputs 10`);
const address = extractAddress(output.stdout, "Contract address: ");

rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
exec(`npx hardhat starknet-call --starknet-network ${NETWORK} --contract contract --function sum_points_to_tuple --address ${address} --inputs "10 20 30 40"`);
