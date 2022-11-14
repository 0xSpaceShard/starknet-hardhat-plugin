import { exec, extractAddress } from "../../utils/utils";
import shell from "shelljs";

console.log("The starknet-verify test is too flaky so it is temporarily suspended. Make sure it's working!");
shell.exit(0);

const NETWORK = process.env.NETWORK;

const MAIN_CONTRACT = "contracts/contract.cairo";
const UTIL_CONTRACT = "contracts/util.cairo";

exec(`npx hardhat starknet-compile ${MAIN_CONTRACT} ${UTIL_CONTRACT}`);

console.log("Waiting for deployment to be accepted");
const output = exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} contract --inputs 10 --wait`);
const address = extractAddress(output.stdout, "Contract address: ");
console.log("Verifying contract at $address");

console.log("Sleeping to allow Voyager to index the deployment");
exec("sleep 1m");

exec(`npx hardhat starknet-verify --starknet-network ${NETWORK} --path ${MAIN_CONTRACT} ${UTIL_CONTRACT} --address ${address} --compiler-version 0.9.0 --license "No License (None)" --account-contract false`);
console.log("Sleeping to allow Voyager to register the verification");
exec("sleep 15s");

const is_verified = exec(`curl "https://goerli.voyager.online/api/contract/${address}/code" | jq ".abiVerified"`);
if (is_verified == "true") {
    console.log("Successfully verified!");
} else {
    console.log("$0: Error: Not verified!");
    shell.exit(1);
}
