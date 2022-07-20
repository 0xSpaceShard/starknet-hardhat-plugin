#!/bin/bash


set -e

MAIN_CONTRACT=contracts/contract.cairo
UTIL_CONTRACT=contracts/util.cairo

npx hardhat starknet-compile $MAIN_CONTRACT $UTIL_CONTRACT

echo "Waiting for deployment to be accepted"
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" contract --inputs 10 --wait)
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")
echo "Verifying contract at $address"

echo "Sleeping to allow Voyager to index the deployment"
sleep 1m

npx hardhat starknet-verify --starknet-network "$NETWORK" --path $MAIN_CONTRACT $UTIL_CONTRACT --address $address --compiler-version 0.9.0 --license "No License (None)"
echo "Sleeping to allow Voyager to register the verification"
sleep 15s

is_verified=$(curl "https://goerli.voyager.online/api/contract/$address/code" | jq ".abiVerified")
if [ "$is_verified" == "true" ]; then
    echo "Successfully verified!"
else
    echo "$0: Error: Not verified!"
    exit 1
fi
