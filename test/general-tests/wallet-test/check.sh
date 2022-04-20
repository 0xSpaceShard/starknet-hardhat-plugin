#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
output=$(npx hardhat starknet-deploy-account --starknet-network "$NETWORK" --wallet OpenZeppelin)
echo $output

npx hardhat test --no-compile test/wallet-test.ts
