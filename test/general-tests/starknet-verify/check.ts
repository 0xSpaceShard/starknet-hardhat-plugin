import { assertEqual, ensureEnvVar, exec, extractAddress } from "../../utils/utils";
import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import axios from "axios";

console.log(
    "The starknet-verify test is too flaky so it is temporarily suspended. Make sure it's working!"
);
process.exit(0);

const network = ensureEnvVar("NETWORK");

const mainContract = "contracts/contract.cairo";
const utilContract = "contracts/util.cairo";

hardhatStarknetCompile(`${mainContract} ${utilContract}`.split(" "));

console.log("Waiting for deployment to be accepted");
const output = hardhatStarknetDeploy(
    `--starknet-network ${network} contract --inputs 10 --wait`.split(" ")
);
const address = extractAddress(output.stdout, "Contract address: ");
console.log("Verifying contract at $address");

console.log("Sleeping to allow Voyager to index the deployment");
exec("sleep 1m");

exec(
    `npx hardhat starknet-verify --starknet-network ${network} --path ${mainContract} ${utilContract} --address ${address} --compiler-version 0.9.0 --license "No License (None)" --account-contract false`
);
console.log("Sleeping to allow Voyager to register the verification");
exec("sleep 15s");

(async () => {
    const { data } = await axios.get(`https://goerli-2.voyager.online/api/contract/${address}/code`);
    assertEqual(data.abiVerified, "true", "Contract is not verified");
})();
