#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo

cp -a starknet-artifacts/contracts test/test-artifacts

npx hardhat test --no-compile test/relative-artifacts.test.ts
