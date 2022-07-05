#!/bin/bash

set -e

trap 'kill $(jobs -p)' EXIT

source ../scripts/check-devnet-is-not-running.sh

check_devnet_is_not_running

# run devnet which will cause integrated-devnet to fail
starknet-devnet --host 127.0.0.1 --port 5050 &

npx hardhat starknet-compile contracts/contract.cairo

#TODO
npx hardhat test --no-compile test/integrated-devnet.test.ts | 
    ../scripts/assert_contains.py "starknet-devnet: error: argument --accounts: invalid int value: 'abc'"
