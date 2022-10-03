#!/bin/bash
set -e

CONTRACT_NAME=old_contract.cairo
CONTRACT_PATH="contracts/$CONTRACT_NAME"
NEW_COMMENT="// Declare this file as a StarkNet contract."

cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"

echo "Testing migration of old cairo contract to a new one"
# Migrate contract to new version.
npx hardhat migrate "$CONTRACT_PATH" 2>&1 |
    ../scripts/assert-contains.py "$NEW_COMMENT"

# Migrate contract to new version with change content in place option.
npx hardhat migrate "$CONTRACT_PATH" --inplace
cat "$CONTRACT_PATH" | ../scripts/assert-contains.py "$NEW_COMMENT"

echo "Success"
