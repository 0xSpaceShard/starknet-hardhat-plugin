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

echo "Sleeping before curling"
sleep 10s

VERIFICATION_RESP="/tmp/verification-resp.json"
curl "https://goerli.voyager.online/api/contract/$address/code" > $VERIFICATION_RESP

CONTRACT_RESP="/tmp/contract-resp.cairo"
jq -r '.contract | ."contract.cairo" | join("\n")' $VERIFICATION_RESP > $CONTRACT_RESP
diff -B $CONTRACT_RESP $MAIN_CONTRACT

UTIL_RESP="/tmp/util-resp.cairo"
jq -r '.contract | ."util.cairo" | join("\n")' $VERIFICATION_RESP > $UTIL_RESP
diff -B $UTIL_RESP $UTIL_CONTRACT

echo "Contracts from the response matching the original ones."
