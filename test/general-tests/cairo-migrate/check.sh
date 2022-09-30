#!/bin/bash
set -e

CONTRACT_NAME=old_contract.cairo
NEW_COMMENT="// Declare this file as a StarkNet contract."

echo "Testing migration of old cairo contract to a new one"
# Migrate contract to new version.
npx hardhat migrate "$CONTRACT_NAME" 2>&1 |
    ../scripts/assert-contains.py "$NEW_COMMENT"

# Migrate contract to new version with change content in place option.
npx hardhat migrate "$CONTRACT_NAME" --inplace
cat "$CONTRACT_NAME" | ../scripts/assert-contains.py "$NEW_COMMENT"

echo "Success"
