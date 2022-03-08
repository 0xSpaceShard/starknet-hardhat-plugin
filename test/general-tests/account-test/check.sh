#!/bin/bash
set -e

DUMMY_DIR=starknet-artifacts/account-contract-artifacts/0.0.0/Account.cairo

mkdir "$DUMMY_DIR"

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/account-test.ts

echo "Testing removal of dummy directory"
if [ -d "$DUMMY_DIR" ]; then
exit 1
fi
echo "Success"
