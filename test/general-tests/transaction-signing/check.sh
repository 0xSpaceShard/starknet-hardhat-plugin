#!/bin/bash
set -e

npx hardhat starknet-compile conctracts/auth_contract.cairo
npx hardhat test test/signing-test.ts
