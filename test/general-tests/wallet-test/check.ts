import path from "path";
import { exec, extractAddress } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

const HOME = process.env.HOME;
const ACCOUNT_DIR = path.join(`${HOME}`, ".starknet_accounts_wallet_test");
process.env.ACCOUNT_DIR = ACCOUNT_DIR;

exec("npx hardhat starknet-compile contracts/contract.cairo");

exec("bash ../scripts/deploy-funded-cli-account.sh");

exec("npx hardhat test --no-compile test/wallet-test.ts");

const output = exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} starknet-artifacts/contracts/contract.cairo/ --inputs 10`);
const ADDRESS = extractAddress(output.stdout, "Contract address: ");

exec(`npx hardhat starknet-call --contract contract --function get_balance --address ${ADDRESS} --wallet OpenZeppelin --starknet-network ${NETWORK}`);
exec(`npx hardhat starknet-invoke --contract contract --function increase_balance --inputs "10 20" --address ${ADDRESS} --wallet OpenZeppelin --starknet-network ${NETWORK}`);
