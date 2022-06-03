#!/bin/bash
set -e

EXPECTED='HardhatPluginError: Could not find metadata for contract "contract.cairo"'

echo "Testing with deleted artifact on recompiler option set to default (off)"
rm -rf starknet-artifacts/contracts/contract.cairo/
npx hardhat run --no-compile scripts/deploy.ts 2>&1 |
    ../scripts/assert-contains.py "$EXPECTED"
echo "Success"
