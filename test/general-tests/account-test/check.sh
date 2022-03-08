#!/bin/bash
set -e

DUMMY_DIR=starknet-artifacts/account-contract-artifacts/0.0.0/Account.cairo

mkdir -p "$DUMMY_DIR"

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/account-test.ts

echo "Testing removal of dummy directory"
if [ -d "$DUMMY_DIR" ]; then
    # If path exists, exit with an error because it should have been deleted while fetching the correct artifacts
    exit 1
fi
echo "Success"
