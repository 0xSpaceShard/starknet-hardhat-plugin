#!/bin/bash
set -e

PREFIX=$(dirname "$0")

CONTRACT_NAME=contract_with_execute.cairo

cp "$PREFIX/$CONTRACT_NAME" contracts/

EXPECTED='Only account contracts may have a function named "__execute__". Use --account-contract flag.'

echo "Testing rejection of compilation without the account flag"
npx hardhat starknet-compile "contracts/$CONTRACT_NAME" 2>&1 \
    | ../scripts/assert-contains.py "$EXPECTED"
echo "Success"

npx hardhat starknet-compile "contracts/$CONTRACT_NAME" --account-contract
