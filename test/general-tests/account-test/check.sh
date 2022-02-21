#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat starknet-compile account-contracts/contracts/Account.cairo

npx hardhat test test/account-test.ts
