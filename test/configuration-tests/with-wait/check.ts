import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile contracts/util.cairo");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/util.cairo/ --starknet-network ${NETWORK} --wait`);
