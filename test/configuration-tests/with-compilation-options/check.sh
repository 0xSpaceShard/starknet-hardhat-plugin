#!/bin/bash
set -e

PREFIX=$(dirname "$0")

echo "Testing rejection of compilation without the account flag"
npx hardhat starknet-compile contracts/contract_with_execute.cairo 2>&1 \
    | tail -n +2 \
    | diff - "$PREFIX/without-account-flag.txt"
echo "Success"

npx hardhat starknet-compile contracts/contract_with_execute.cairo --acount-contract
