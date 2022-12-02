import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { DEVNET_URL } from "../constants/constants";
import { hardhatStarknetDeployAccount, hardhatStarknetNewAccount } from "./cli-functions";
import { assertEqual, ensureEnvVar } from "./utils";

export async function deployFundedAccount(url = DEVNET_URL) {
    const network = ensureEnvVar("NETWORK");
    const accountDir = ensureEnvVar("ACCOUNT_DIR");

    assertEqual(network, "devnet", "only works with NETWORK set to devnet");

    const args = ["--starknet-network", network, "--wallet", "OpenZeppelin"];

    // Creates new account
    hardhatStarknetNewAccount(args);

    const accountFile = path.join(accountDir, "starknet_open_zeppelin_accounts.json");
    const accountAddress = JSON.parse(readFileSync(accountFile, "utf-8"))[network].OpenZeppelin
        .address;

    console.log(`Funding account ${accountAddress} on ${network}.`);
    const data = {
        address: accountAddress,
        amount: 10 ** 18,
        lite: true
    };

    await axios.post(`${url}/mint`, data);

    // Deploying funded account on the network
    hardhatStarknetDeployAccount(args);
}
