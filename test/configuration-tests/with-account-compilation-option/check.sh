#!/bin/bash
set -e

CONTRACT_NAME=contract_with_execute.cairo
CONTRACT_PATH="contracts/$CONTRACT_NAME"

cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"

EXPECTED='Only account contracts may have a function named "__execute__". Use --account-contract flag.'

echo "Testing rejection of compilation without the account flag"
npx hardhat starknet-compile "$CONTRACT_PATH" 2>&1 |
    ../scripts/assert-contains.py "$EXPECTED"
echo "Success"

npx hardhat starknet-compile "$CONTRACT_PATH" --account-contract
