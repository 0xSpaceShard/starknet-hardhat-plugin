import { readFileSync } from "fs";
import path from "path";
import { StarknetPluginError } from "../../../src/starknet-plugin-error";
import { hardhatStarknetNewAccount } from "../../utils/cli-functions";
import { ensureEnvVar, extractAddress } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");
const home = ensureEnvVar("HOME");

const accountDir = path.join(home, ".starknet_new_account_test");
process.env.ACCOUNT_DIR = accountDir;
const accountFilePath = path.join(accountDir, "starknet_open_zeppelin_accounts.json");

const output = hardhatStarknetNewAccount(`--wallet OpenZeppelin --starknet-network ${network}`.split(" "));
const accountAddressStd = extractAddress(output.stdout, "Account address: ");

// Read newly created account and grab the address
const accountFile = readFileSync(accountFilePath);
const accountAddressFile = JSON.parse(accountFile.toString())[network].OpenZeppelin.address;

// Change hex to int
const addressStd = parseInt(accountAddressStd, 16);
const addressFile = parseInt(accountAddressFile, 16);

// If address_one and address_two are equal then success
if (addressStd === addressFile) {
    console.log("Success");
} else {
    throw new StarknetPluginError("Addresses are not equal");
}
