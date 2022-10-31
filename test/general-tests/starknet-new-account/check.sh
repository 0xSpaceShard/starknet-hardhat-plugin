#!/bin/bash

set -eu

export ACCOUNT_DIR="$HOME/.starknet_new_account_test"
ACCOUNT_FILE="$ACCOUNT_DIR/starknet_open_zeppelin_accounts.json"

output=$(npx hardhat starknet-new-account --wallet OpenZeppelin --starknet-network "$NETWORK")
tail=${output#*$'\n'Account address: }
ACCOUNT_ADDRESS_FROM_STD=${tail%%$'\n'*}

# Read newly created account and grab the address
ACCOUNT_ADDRESS_FROM_FILE=$(jq -r ."$NETWORK".OpenZeppelin.address $ACCOUNT_FILE)

# Change hex to int
address_one=$(python -c "print(int('${ACCOUNT_ADDRESS_FROM_STD}', 16))")
address_two=$(python -c "print(int('${ACCOUNT_ADDRESS_FROM_FILE}', 16))")

# If address_one and address_two are equal then success
if [ ${address_one} == ${address_two} ]; then
    echo "Success"
else
    echo "Failed"
    exit 1
fi
