#!/bin/bash
set -e

CONTRACT_NAME=contract_with_unwhitelisted_hints.cairo
CONTRACT_PATH="contracts/$CONTRACT_NAME"

cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"

EXPECTED="Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts."

echo "Testing rejection of compilation without the --disable-hint-validation flag"
npx hardhat starknet-compile "$CONTRACT_PATH" 2>&1 |
    ../scripts/assert-contains.py "$EXPECTED"
echo "Success"

npx hardhat starknet-compile "$CONTRACT_PATH" --disable-hint-validation
