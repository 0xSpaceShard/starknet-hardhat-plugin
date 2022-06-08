#!/bin/bash


set -e

MAIN_CONTRACT=contracts/contract.cairo
UTIL_CONTRACT=contracts/util.cairo

npx hardhat starknet-compile $MAIN_CONTRACT $UTIL_CONTRACT

echo "Waiting for deployment to be accepted"
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/$MAIN_CONTRACT --inputs 10 --wait)
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

echo "Sleeping to allow Voyager to index the deployment"
sleep 1m

echo "Verifying contract at $address"

npx hardhat starknet-verify --starknet-network "$NETWORK" --path $MAIN_CONTRACT $UTIL_CONTRACT --address $address --compiler-version 0.8.1 --license "No License (None)"

is_verified=$(curl "https://goerli.voyager.online/api/contract/$address/code" | jq ".abiVerified")
if [ "$is_verified" == "true" ]; then
    echo "Successfully verified!"
else
    echo "$0: Error: Not verified!"
    exit 1
fi
