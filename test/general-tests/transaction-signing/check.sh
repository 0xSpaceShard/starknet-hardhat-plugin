#!/bin/bash
set -e

npx hardhat starknet-compile contracts/auth_contract.cairo
npx hardhat test --no-compile test/signing-test.ts
