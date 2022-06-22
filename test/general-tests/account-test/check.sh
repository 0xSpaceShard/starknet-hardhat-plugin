#!/bin/bash
set -eu

npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo

if [ "$NETWORK" == "devnet" ]; then
    npx hardhat test --no-compile scripts/deploy-argent.ts
fi

npx hardhat test --no-compile test/oz-account-test.ts test/argent-account-test.ts
