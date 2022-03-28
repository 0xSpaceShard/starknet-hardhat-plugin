#!/bin/bash
set -e

PREFIX=$(dirname "$0")

CONTRACT_NAME=contract_with_unwhitelisted_hints.cairo

#cp "$PREFIX/$CONTRACT_NAME" contracts/

echo "Testing rejection of compilation without the account flag"

ERROR_MSG="Hint is not whitelisted.
This may indicate that this library function cannot be used in StarkNet contracts."

npx hardhat starknet-compile "$CONTRACT_NAME" 2>&1 >/dev/null | pcregrep -M -q "$ERROR_MSG"

echo "Success"

npx hardhat starknet-compile "$CONTRACT_NAME" --disable-hint-validation
