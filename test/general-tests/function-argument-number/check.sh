#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat test --no-compile test/function-args-test.ts
