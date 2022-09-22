#!/bin/bash

set -eu

# assumes account name is OpenZeppelin

if [[ "$NETWORK" != "devnet" ]]; then
    echo "$0 only works with NETWORK set to devnet"
    exit 1
fi

ACCOUNT_FILE="$HOME/.starknet_accounts/starknet_open_zeppelin_accounts.json"
# delete to avoid conflict if already exists
rm -f "$ACCOUNT_FILE"

npx hardhat starknet-deploy-account --starknet-network "$NETWORK" --wallet OpenZeppelin
ACCOUNT_ADDRESS=$(jq -r .$NETWORK.OpenZeppelin.address $ACCOUNT_FILE)

echo "Funding $ACCOUNT_ADDRESS"
# assumes address, don't hardcode this in the future
curl 127.0.0.1:5050/mint \
    -H "Content-Type: application/json" \
    -d "{ \"address\": \"$ACCOUNT_ADDRESS\", \"amount\": 1000000000000000000, \"lite\": true }"
