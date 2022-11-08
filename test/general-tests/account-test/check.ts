import { exec } from "../../utils/utils";
import shell from "shelljs";

exec("npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo");
exec("npx hardhat test --no-compile test/oz-account-test.ts");

if (process.env.NETWORK == "devnet") {
    exec("npx hardhat test --no-compile scripts/deploy-argent.ts");

    shell.env.TOKEN_ADDRESS = "0x62230EA046A9A5FBC261AC77D03C8D41E5D442DB2284587570AB46455FD2488";
    shell.env.SENDER_ADDRESS = process.env.OZ_ACCOUNT_ADDRESS;
    shell.env.SENDER_PRIVATE_KEY = process.env.OZ_ACCOUNT_PRIVATE_KEY;
    shell.env.SENDER_IMPLEMENTATION = "OpenZeppelin";
    shell.env.RECIPIENT_ADDRESS = process.env.ARGENT_ACCOUNT_ADDRESS;
    shell.env.TRANSFER_AMOUNT = "0x62230EA046A9A5FBC261AC77D03C8D41E5D442DB2284587570AB46455FD2488";
    exec("npx hardhat test --no-compile scripts/transfer-funds.ts");
}

exec("npx hardhat test --no-compile test/argent-account-test.ts");
