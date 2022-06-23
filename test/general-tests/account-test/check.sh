#!/bin/bash
set -eu

npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo

if [ "$NETWORK" == "devnet" ]; then
    npx hardhat test --no-compile scripts/deploy-argent.ts

    TOKEN_ADDRESS="0x6a7a6243f92a347c03c935ce4834c47cbd2a951536c10319168866db9d57983" \
    SENDER_ADDRESS=$OZ_ACCOUNT_ADDRESS \
    SENDER_PRIVATE_KEY=$OZ_ACCOUNT_PRIVATE_KEY \
    SENDER_IMPLEMENTATION="OpenZeppelin" \
    RECIPIENT_ADDRESS=$ARGENT_ACCOUNT_ADDRESS \
    TRANSFER_AMOUNT="1000000000000000000" \
    npx hardhat test --no-compile scripts/transfer-funds.ts
fi

npx hardhat test --no-compile test/oz-account-test.ts test/argent-account-test.ts
