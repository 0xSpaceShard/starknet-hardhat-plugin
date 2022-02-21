#!/bin/bash
set -e

trap 'kill $(jobs -p)' EXIT

npx hardhat starknet-compile contracts/l1l2.cairo
npx hardhat node &
sleep 1

npx hardhat test --network localhost test/postman.test.ts
