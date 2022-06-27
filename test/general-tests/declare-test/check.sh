#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo contracts/deployer.cairo
npx hardhat test --no-compile test/declare-deploy.test.ts
