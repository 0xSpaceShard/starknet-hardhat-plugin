import { exec } from "../../utils/utils";

const NETWORK = process.env.NETWORK;
const INITIAL_VALUE = 10;
const PUBLIC_KEY = "1628448741648245036800002906075225705100596136133912895015035902954123957052";

exec("npx hardhat starknet-compile");
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network ${NETWORK} --inputs ${INITIAL_VALUE}`);
exec(`npx hardhat starknet-deploy starknet-artifacts/contracts/auth_contract.cairo/ --inputs "${PUBLIC_KEY} ${INITIAL_VALUE}" --starknet-network ${NETWORK}`);
exec("npx hardhat test --no-compile test/sample-test.ts");
