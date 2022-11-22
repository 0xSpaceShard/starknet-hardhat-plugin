import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { StarknetPluginError } from "../../src/starknet-plugin-error";
import { hardhatStarknetDeployAccount, hardhatStarknetNewAccount } from "./cli-functions";
import { ensureEnvVar } from "./utils";

export async function deployFundedAccount(url?: string) {
    const network = ensureEnvVar("NETWORK");
    const accountDir = ensureEnvVar("ACCOUNT_DIR");

    if (network !== "devnet") {
        throw new StarknetPluginError("only works with NETWORK set to devnet");
    }

    const args = [
        "--starknet-network",
        network,
        "--wallet",
        "OpenZeppelin"
    ];

    // Creates new account
    hardhatStarknetNewAccount(args);

    const accountFile = path.join(`${accountDir}`, "starknet_open_zeppelin_accounts.json");
    const accountAddress = JSON.parse(readFileSync(accountFile, "utf-8"))[`${network}`].OpenZeppelin.address;

    console.log(`Funding account ${accountAddress} on ${network}.`);
    url = url ||  "http://127.0.0.1:5050";
    await axios.post(`${url}/mint`, {
        address: accountAddress,
        amount: 1000000000000000000n,
        lite: true
    });

    // Deploying funded account on the network
    hardhatStarknetDeployAccount(args);
}