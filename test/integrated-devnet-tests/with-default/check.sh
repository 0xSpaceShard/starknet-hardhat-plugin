#!/bin/bash
set -e

../check_devnet_is_not_running.sh

check_devnet_is_not_running
npx hardhat starknet-compile contracts/contract.cairo
npx hardhat test --no-compile test/integrated-devnet.test.ts
check_devnet_is_not_running
