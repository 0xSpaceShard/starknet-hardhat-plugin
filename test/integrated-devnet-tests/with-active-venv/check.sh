#!/bin/bash
set -e

source ../my-venv/bin/activate

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat test --no-compile test/integrated-devnet.test.ts