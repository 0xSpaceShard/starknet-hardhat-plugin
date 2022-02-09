#!/bin/bash
set -e

trap 'kill $(jobs -p)' EXIT

npx hardhat starknet-compile
npx hardhat compile
npx hardhat node &
sleep 1

npx hardhat test --network localhost test/postman.test.ts
