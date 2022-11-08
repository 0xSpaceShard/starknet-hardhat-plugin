import { exec } from "../../utils/utils";

const INITIAL_VALUE = 10;
const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network ${NETWORK} --inputs ${INITIAL_VALUE}`);
exec("npx hardhat test --no-compile test/quick-test.ts");
