#!/bin/bash
set -e

CONTRACT_NAME=dummy_account.cairo
CONTRACT_PATH="contracts/$CONTRACT_NAME"

cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"

EXPECTED="Only account contracts may have functions named {'__execute__'}. Use the --account-contract flag to compile an account contract."

echo "Testing rejection of compilation without the account flag"
npx hardhat starknet-compile "$CONTRACT_PATH" 2>&1 |
    ../scripts/assert-contains.py "$EXPECTED"
echo "Success"

npx hardhat starknet-compile "$CONTRACT_PATH" --account-contract
