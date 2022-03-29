#!/bin/bash
set -e

PREFIX=$(dirname "$0")

CONTRACT_NAME=contract_with_unwhitelisted_hints.cairo

cp "$PREFIX/$CONTRACT_NAME" contracts/

EXPECTED="Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts."

echo "Testing rejection of compilation without the --disable-hint-validation flag"
npx hardhat starknet-compile "$CONTRACT_NAME" 2>&1 |
    ../scripts/assert-contains.py "$EXPECTED"
echo "Success"

npx hardhat starknet-compile "$CONTRACT_NAME" --disable-hint-validation
