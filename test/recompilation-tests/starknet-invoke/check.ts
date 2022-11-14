import { rmSync } from "fs";
import path from "path";
import { exec, extractAddress } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

// Hardhat starknet-invoke command
console.log("Testing Recompilation with deleted artifact on hardhat starknet-invoke");
const output = exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} starknet-artifacts/contracts/contract.cairo/ --inputs 10`);
// Grab the output Contract address to a variable using parameter expansion
const address = extractAddress(output.stdout, "Contract address: ");
// Remove artifact contract to force recompilation
rmSync("starknet-artifacts/contracts/contract.cairo", { recursive: true, force: true });
const HOME = process.env.HOME;
const ACCOUNT_DIR = path.join(`${HOME}`, ".starknet_accounts_recompile_test");
process.env.ACCOUNT_DIR = ACCOUNT_DIR;

exec("bash ../scripts/deploy-funded-cli-account.sh");

exec(`npx hardhat starknet-invoke \
    --starknet-network ${NETWORK} \
    --contract contract \
    --function increase_balance \
    --address ${address} \
    --inputs "10 20" \
    --wallet OpenZeppelin`);
