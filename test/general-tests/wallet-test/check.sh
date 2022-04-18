#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
output=$(npx hardhat starknet-deploy-account --starknet-network "$NETWORK" --wallet OpenZeppelin)
echo $output

echo "This is skipped because it doesn't work with the cairo version 0.8.1"
# npx hardhat test --no-compile test/wallet-test.ts
