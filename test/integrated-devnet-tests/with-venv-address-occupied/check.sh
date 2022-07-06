#!/bin/bash

set -e

trap 'kill $(jobs -p)' EXIT

source ../scripts/check-devnet-is-not-running.sh

check_devnet_is_not_running
starknet-devnet --host 127.0.0.1 --port 5050 --accounts 0 &

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/integrated-devnet.test.ts 2>&1 | 
    ../scripts/assert-contains.py "Cannot spawn integrated-devnet: 127.0.0.1:5050 already occupied."
