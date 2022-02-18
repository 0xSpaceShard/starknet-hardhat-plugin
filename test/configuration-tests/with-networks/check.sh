#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
ARTIFACT_PATH=starknet-artifacts/contracts/contract.cairo/
INVALID_NETWORK="foo"
PREFIX=$(dirname "$0")

echo "Testing no starknet network"
npx hardhat starknet-deploy "$ARTIFACT_PATH" --inputs 10 2>&1 \
    | tail -n +2 \
    | diff - "$PREFIX/without-starknet-network.txt"
echo "Success"

echo "Testing invalid starknet network"
npx hardhat starknet-deploy --starknet-network "$INVALID_NETWORK" "$ARTIFACT_PATH" --inputs 10 2>&1 \
    | tail -n +2 \
    | diff - "$PREFIX/invalid-starknet-network.txt"
echo "Success"

echo "Testing no mocha network"
NETWORK=""    npx hardhat test --no-compile test/contract-factory-test.ts
echo "Success"

echo "Testing invalid mocha network"
NETWORK="$INVALID_NETWORK" npx hardhat test test/contract-factory-test.ts 2>&1 \
    | tail -n +9 \
    | head -n 6 \
    | diff - "$PREFIX/invalid-mocha-network.txt"
echo "Success"
