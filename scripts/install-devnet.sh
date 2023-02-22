#!/bin/bash

set -eu

# Get default from config.json file
STARKNET_DEVNET_DEFAULT=$(node -e "console.log(require('../config.json').STARKNET_DEVNET)")

pip3 install "starknet-devnet==${STARKNET_DEVNET:=$STARKNET_DEVNET_DEFAULT}" | grep --invert-match 'Requirement already satisfied:'
STARKNET_DEVNET_PATH=$(which starknet-devnet)
echo "starknet-devnet at: $STARKNET_DEVNET_PATH"
