#!/bin/bash
set -e

# Hardhat starknet-deploy command
echo "Testing Recompilation with deleted artifact on starknet-deploy"
rm -rf starknet-artifacts/contracts/contract.cairo
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
echo $output
