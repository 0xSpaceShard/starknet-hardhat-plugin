#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo contracts/simple_storage.cairo contracts/empty_constructor.cairo
npx hardhat test --no-compile test/constructor.test.ts
