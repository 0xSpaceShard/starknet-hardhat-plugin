#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo contracts/test-starknet.cairo
npx hardhat starknet-deploy --starknet-network alpha starknet-artifacts/contracts/contract.cairo/ starknet-artifacts/contracts/test-starknet.cairo/test-starknet.json
