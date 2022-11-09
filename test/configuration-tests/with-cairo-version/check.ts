import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile contracts/contract.cairo");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo --starknet-network ${NETWORK} --inputs 10`);
