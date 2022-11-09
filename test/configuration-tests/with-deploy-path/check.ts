import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile contracts/contract.cairo");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --inputs "10" --starknet-network ${NETWORK}`);
exec(`npx hardhat starknet-deploy contract --inputs "10" --starknet-network ${NETWORK}`);
