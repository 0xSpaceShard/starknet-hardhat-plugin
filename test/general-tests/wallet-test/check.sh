#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
output=$(npx hardhat starknet-deploy-account --starknet-network "$NETWORK" --wallet OpenZeppelin)
echo $output

npx hardhat test --no-compile test/wallet-test.ts

output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
echo $output

ADDRESS=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

ACCOUNT_FILE="~/.starknet_accounts"
ACCOUNT_ADDRESS=$(jq -r '.["alpha-goerli"].__default__.address' $ACCOUNT_FILE)
curl 127.0.0.1:5050/mint \
    -H "Content-Type: application/json" \
    -d "{ \"address\": \"$ACCOUNT_ADDRESS\", \"amount\": 1000000000000000000, \"lite\": true }"

npx hardhat starknet-call --contract contract --function get_balance --address "$ADDRESS" --wallet OpenZeppelin --starknet-network "$NETWORK"
npx hardhat starknet-invoke --contract contract --function increase_balance --inputs "10 20" --address "$ADDRESS" --wallet OpenZeppelin --starknet-network "$NETWORK"
