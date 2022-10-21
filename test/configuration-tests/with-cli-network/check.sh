#!/bin/bash
set -e

# Test how --starknet-network can be specified through CLI while at the same time
# overriding hardhat.config specification.
# It would be sufficient to run this test just once and not for both alpha and devnet.
# Only tests if --starknet-network is accepted, not if the correct network is targeted.

echo "$0: Testing hh run with --starknet-network is currently disabled"
# npx hardhat run --no-compile scripts/compile-contract.ts --starknet-network devnet
npx hardhat test --no-compile --starknet-network devnet test/quick-test.ts
