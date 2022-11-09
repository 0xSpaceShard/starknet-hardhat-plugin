import shell from "shelljs";
import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile contracts/contract.cairo");
exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} my-starknet-artifacts/contracts/contract.cairo/ --inputs 10`);
shell.rm("-rf", "my-starknet-artifacts");
