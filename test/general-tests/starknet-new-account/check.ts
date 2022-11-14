import { readFileSync } from "fs";
import path from "path";
import shell from "shelljs";
import { exec, extractAddress } from "../../utils/utils";

const NETWORK = process.env.NETWORK;
const HOME = process.env.HOME;

const ACCOUNT_DIR = path.join(`${HOME}`, ".starknet_new_account_test");
process.env.ACCOUNT_DIR = ACCOUNT_DIR;
const ACCOUNT_FILE_PATH = path.join(ACCOUNT_DIR, "starknet_open_zeppelin_accounts.json");

const output = exec(`npx hardhat starknet-new-account --wallet OpenZeppelin --starknet-network ${NETWORK}`);
const ACCOUNT_ADDRESS_FROM_STD = extractAddress(output.stdout, "Account address: ");

// Read newly created account and grab the address
const ACCOUNT_FILE = readFileSync(ACCOUNT_FILE_PATH);
const ACCOUNT_ADDRESS_FROM_FILE = JSON.parse(ACCOUNT_FILE.toString())[`${NETWORK}`].OpenZeppelin.address;

// Change hex to int
const addressOne = parseInt(ACCOUNT_ADDRESS_FROM_STD, 16);
const addressTwo = parseInt(ACCOUNT_ADDRESS_FROM_FILE, 16);

// If address_one and address_two are equal then success
if (addressOne === addressTwo) {
    console.log("Success");
} else {
    console.log("Failed");
    shell.exit(1);
}
