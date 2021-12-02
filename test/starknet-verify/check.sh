#!/bin/bash
set -e

npx hardhat starknet-compile
output=$(starknet deploy --contract starknet-artifacts/contracts/test.cairo/test.json --network alpha)
echo $output
deploy_tx_id=$(echo $output | sed -r "s/.*Transaction ID: (\w*).*/\1/")
address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

echo "Address: $address"
echo "tx_id: $deploy_tx_id"


tx_status=$(starknet --network alpha tx_status --hash $deploy_tx_id)