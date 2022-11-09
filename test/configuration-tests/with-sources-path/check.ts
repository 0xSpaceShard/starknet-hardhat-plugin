import shell from "shelljs";
import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

shell.mv("contracts", "my-starknet-sources");

exec("npx hardhat starknet-compile");
exec(`npx hardhat starknet-deploy starknet-artifacts/my-starknet-sources/contract.cairo/ --starknet-network ${NETWORK} --inputs 10`);
