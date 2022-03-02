#!/bin/bash
set -e

echo "The starknet-verify test is temporarily disabled."
echo "To enable it back, uncomment the lines in its check.sh."


# npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo

# output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/util.cairo/)
# util_address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

# output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/)
# main_address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

# echo "Util contract address: $util_address"
# echo "Main contract address: $main_address"

# sleep 5m

### Single contract verification

# npx hardhat starknet-verify --starknet-network "$NETWORK" --path contracts/util.cairo --address $util_address

### Multi part contract verification

# npx hardhat starknet-verify --starknet-network "$NETWORK" --paths "contracts/contract.cairo contracts/util.cairo" --address $main_address
