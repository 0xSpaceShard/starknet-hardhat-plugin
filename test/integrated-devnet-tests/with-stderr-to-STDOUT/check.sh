#!/bin/bash

set -e

source ../scripts/check-devnet-is-not-running.sh

check_devnet_is_not_running

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/integrated-devnet.test.ts 2>&1 | 
    ../scripts/assert-contains.py "starknet-devnet: error: argument --accounts: invalid int value: 'invalid_value'"
