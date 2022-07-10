#!/bin/bash
set -eu

npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo

npx hardhat test --no-compile test/oz-account-test.ts

if [ "$NETWORK" == "devnet" ]; then
    npx hardhat test --no-compile scripts/deploy-argent.ts

    TOKEN_ADDRESS="0x62230EA046A9A5FBC261AC77D03C8D41E5D442DB2284587570AB46455FD2488" \
    SENDER_ADDRESS=$OZ_ACCOUNT_ADDRESS \
    SENDER_PRIVATE_KEY=$OZ_ACCOUNT_PRIVATE_KEY \
    SENDER_IMPLEMENTATION="OpenZeppelin" \
    RECIPIENT_ADDRESS=$ARGENT_ACCOUNT_ADDRESS \
    TRANSFER_AMOUNT="1000000000000000000" \
    npx hardhat test --no-compile scripts/transfer-funds.ts
fi

npx hardhat test --no-compile test/argent-account-test.ts
