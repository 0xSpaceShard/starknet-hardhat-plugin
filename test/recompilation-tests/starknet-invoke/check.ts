import path from "path";
import { hardhatStarknetDeploy, hardhatStarknetInvoke } from "../../utils/cli-functions";
import { deployFundedAccount } from "../../utils/deploy-funded-account";
import { ensureEnvVar, extractAddress, rmrfSync } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");
// Hardhat starknet-invoke command
console.log("Testing Recompilation with deleted artifact on hardhat starknet-invoke");
const output = hardhatStarknetDeploy(
    `--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
        " "
    )
);
// Grab the output Contract address to a variable using parameter expansion
const address = extractAddress(output.stdout, "Contract address: ");
// Remove artifact contract to force recompilation
rmrfSync("starknet-artifacts/contracts/contract.cairo");
const home = ensureEnvVar("HOME");
const accountDir = path.join(home, ".starknet_accounts_recompile_test");
process.env.ACCOUNT_DIR = accountDir;

(async () => {
    await deployFundedAccount();
    const args = `--starknet-network ${network} --contract contract --address ${address} --function increase_balance --inputs "10 20" --wallet OpenZeppelin`;
    hardhatStarknetInvoke(args.split(" "));
})();
