#!/bin/bash
set -e

INITIAL_VALUE=10

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network $1 --inputs "$INITIAL_VALUE"
npx hardhat test test/quick-test.ts
