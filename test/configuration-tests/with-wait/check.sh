#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/contracts/test.cairo/ --starknet-network "$NETWORK" --wait
