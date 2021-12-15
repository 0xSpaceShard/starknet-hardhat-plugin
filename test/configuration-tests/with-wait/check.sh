#!/bin/bash
set -e

npx hardhat starknet-compile contracts/util.cairo
npx hardhat starknet-deploy starknet-artifacts/contracts/util.cairo/ --starknet-network "$NETWORK" --wait
