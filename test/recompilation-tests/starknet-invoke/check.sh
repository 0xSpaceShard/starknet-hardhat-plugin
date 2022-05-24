#!/bin/bash
set -e

# Hardhat starknet-invoke command
echo "Testing Recompilation with deleted artifact on hardhat starknet-invoke"
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
ADDRESS=$(awk '{for(i=1;i<=NF;i++) {if($i~"address:") {print $(i+1)}}}' <<< "$output")
# Remove artifact contract
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat starknet-invoke --starknet-network "$NETWORK" --contract contract --function increase_balance --address "$ADDRESS" --inputs "10 20"
