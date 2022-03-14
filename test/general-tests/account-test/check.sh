#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/oz-account-test.ts
npx hardhat test --no-compile test/argent-account-test.ts