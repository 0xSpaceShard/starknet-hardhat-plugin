#!/bin/bash

set -eu

CONTRACT_NAME=invalid_contract.cairo
CONTRACT_PATH="contracts/$CONTRACT_NAME"

cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"

echo "Testing rejection of compilation with correct message"
npx hardhat starknet-compile "$CONTRACT_PATH" 2>&1 |
    ../scripts/assert-contains.py "Unknown identifier 'openzeppelin.token.erc721.library.ERC721.nonexistent_method'"
echo "Success"
