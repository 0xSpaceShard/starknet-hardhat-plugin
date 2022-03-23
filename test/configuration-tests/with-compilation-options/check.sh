#!/bin/bash
set -e

PREFIX=$(dirname "$0")

CONTRACT_NAME=contract_with_execute.cairo

cp "$PREFIX/$CONTRACT_NAME" contracts/

echo "Testing rejection of compilation without the account flag"
npx hardhat starknet-compile "contracts/$CONTRACT_NAME" 2>&1 \
    | tail -n +3 \
    | head -n 1 \
    | diff - "$PREFIX/without-account-flag.txt"
echo "Success"

npx hardhat starknet-compile "contracts/$CONTRACT_NAME" --acount-contract
