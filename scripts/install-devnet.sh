#!/bin/bash

set -eu

pip3 install "starknet-devnet==$STARKNET_DEVNET"
STARKNET_DEVNET_PATH=$(which starknet-devnet)
echo "starknet-devnet at: $STARKNET_DEVNET_PATH"

pip3 install cairo-rs-py
echo "installed cairo-rs-py"
