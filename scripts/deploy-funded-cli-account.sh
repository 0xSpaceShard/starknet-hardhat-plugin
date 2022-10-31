#!/bin/bash

set -eu

if [[ "$NETWORK" != "devnet" ]]; then
    echo "$0 only works with NETWORK set to devnet"
    exit 1
fi

ACCOUNT_FILE="$ACCOUNT_DIR/starknet_open_zeppelin_accounts.json"

npx hardhat starknet-new-account --starknet-network "$NETWORK" --wallet OpenZeppelin
ACCOUNT_ADDRESS=$(jq -r .$NETWORK.OpenZeppelin.address $ACCOUNT_FILE)

echo "Funding $ACCOUNT_ADDRESS"
# assumes address, don't hardcode this in the future
curl 127.0.0.1:5050/mint \
    -H "Content-Type: application/json" \
    -d "{ \"address\": \"$ACCOUNT_ADDRESS\", \"amount\": 1000000000000000000, \"lite\": true }"

npx hardhat starknet-deploy-account --starknet-network "$NETWORK" --wallet OpenZeppelin
