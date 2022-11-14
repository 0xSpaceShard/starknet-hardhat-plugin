import path from "path";
import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec(`bash ${path.join(__dirname, "venv.sh")}`);
const INITIAL_VALUE = 10;

exec("npx hardhat starknet-compile");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network ${NETWORK} --inputs ${INITIAL_VALUE}`);
