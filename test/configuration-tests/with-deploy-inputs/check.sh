#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --inputs "10" --starknet-network "$NETWORK"
