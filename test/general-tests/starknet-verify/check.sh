#!/bin/bash
set -e

echo "The starknet-verify test is temporarily disabled."
echo "To enable it back, uncomment the lines in its check.sh."
# npx hardhat starknet-compile
# output=$(npx hardhat starknet-deploy --starknet-network $1 starknet-artifacts/contracts/test.cairo/)
# echo $output
# address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

# echo "Address: $address"

# sleep 5m

# npx hardhat starknet-verify --starknet-network $1 --path contracts/test.cairo --address $address
