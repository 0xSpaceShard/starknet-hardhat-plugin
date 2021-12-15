#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat starknet-deploy --starknet-network "$NETWORK" my-starknet-artifacts/contracts/contract.cairo/ --inputs 10
rm -rf my-starknet-artifacts
