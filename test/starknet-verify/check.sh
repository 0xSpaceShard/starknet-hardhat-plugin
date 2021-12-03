#!/bin/bash
set -e

npx hardhat starknet-compile
output=$(npx hardhat starknet-deploy --starknet-network alpha my-starknet-artifacts/contracts/test.cairo/)
echo $output
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

echo "Address: $address"

sleep 5m

npx hardhat starknet-verify --starknet-network alpha --path contracts/test.cairo --address $address
