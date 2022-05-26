#!/bin/bash
set -e

PREFIX=$(dirname "$0")

echo "Testing with deleted artifact on recompiler option set to false"
rm -rf starknet-artifacts/contracts/contract.cairo/
npx hardhat run --no-compile scripts/deploy.ts 2>&1 \
    | head -n +4 \
    | tail -1 \
    | diff - "$PREFIX/artifact-expected.txt"
echo "Success"
