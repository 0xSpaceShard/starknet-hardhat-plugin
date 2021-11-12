#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo contracts/auth_contract.cairo
npx hardhat test
