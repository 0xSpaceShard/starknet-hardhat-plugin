#!/bin/bash
set -e

MAIN_CONTRACT=contracts/contract.cairo
UTIL_CONTRACT=contracts/util.cairo

npx hardhat starknet-compile $MAIN_CONTRACT $UTIL_CONTRACT

echo "Waiting for deployment to be accepted"
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" contract --inputs 10 --wait)
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

echo "Sleeping to allow Voyager to index the deployment"
sleep 30s

echo "Verifying contract at $address"
npx hardhat starknet-verify --starknet-network "$NETWORK" --path $MAIN_CONTRACT $UTIL_CONTRACT --address $address

echo "Sleeping before fetching the verified code - seems to be necessary"
sleep 30s

is_verified=$(curl "https://goerli.voyager.online/api/contract/$address/code" | jq ".abiVerified")
if [ is_verified == "true" ]; then
    echo "Successfully verified!"
else
    echo "Error: Not verified!"
    exit 1
fi
