#!/bin/bash
set -e

npx hardhat starknet-compile
output=$(starknet deploy --contract starknet-artifacts/contracts/test.cairo/test.json --network alpha)
echo $output
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

echo "Address: $address"

sleep 5m

npx hardhat starknet-verify --starknet-network alpha --path contracts/test.cairo --address $address
