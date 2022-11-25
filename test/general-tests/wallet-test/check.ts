import path from "path";
import {
    hardhatStarknetCompile,
    hardhatStarknetTest,
    hardhatStarknetDeploy,
    hardhatStarknetCall,
    hardhatStarknetInvoke
} from "../../utils/cli-functions";
import { deployFundedAccount } from "../../utils/deploy-funded-account";
import { ensureEnvVar, extractAddress } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");
const home = ensureEnvVar("HOME");

const accountDir = path.join(home, ".starknet_accounts_wallet_test");
process.env.ACCOUNT_DIR = accountDir;

hardhatStarknetCompile(["contracts/contract.cairo"]);

(async () => {
    await deployFundedAccount();
    hardhatStarknetTest("--no-compile test/wallet-test.ts".split(" "));

    const output = hardhatStarknetDeploy(
        `--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
            " "
        )
    );
    const address = extractAddress(output.stdout, "Contract address: ");

    hardhatStarknetCall(
        `--contract contract --function get_balance --address ${address} --wallet OpenZeppelin --starknet-network ${network}`.split(
            " "
        )
    );
    hardhatStarknetInvoke(
        `--contract contract --function increase_balance --inputs "10 20" --address ${address} --wallet OpenZeppelin --starknet-network ${network}`.split(
            " "
        )
    );
})();
