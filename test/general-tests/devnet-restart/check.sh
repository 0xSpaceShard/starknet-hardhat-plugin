#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat test --no-compile test/devnet-restart.test.ts
