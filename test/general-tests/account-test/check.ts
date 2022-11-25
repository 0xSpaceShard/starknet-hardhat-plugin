import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile("contracts/contract.cairo contracts/util.cairo".split(" "));
hardhatStarknetTest("--no-compile test/oz-account-test.ts".split(" "));

if (process.env.NETWORK === "devnet") {
    hardhatStarknetTest("--no-compile scripts/deploy-argent.ts".split(" "));

    process.env.TOKEN_ADDRESS = "0x62230EA046A9A5FBC261AC77D03C8D41E5D442DB2284587570AB46455FD2488";
    process.env.SENDER_ADDRESS = process.env.OZ_ACCOUNT_ADDRESS;
    process.env.SENDER_PRIVATE_KEY = process.env.OZ_ACCOUNT_PRIVATE_KEY;
    process.env.SENDER_IMPLEMENTATION = "OpenZeppelin";
    process.env.RECIPIENT_ADDRESS = process.env.ARGENT_ACCOUNT_ADDRESS;
    process.env.TRANSFER_AMOUNT = "1000000000000000000";
    hardhatStarknetTest("--no-compile scripts/transfer-funds.ts".split(" "));
}

hardhatStarknetTest("--no-compile test/argent-account-test.ts".split(" "));
