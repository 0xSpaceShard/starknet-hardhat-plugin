#!/bin/bash

set -eu

pip3 install "starknet-devnet==$STARKNET_DEVNET"
STARKNET_DEVNET_PATH=$(which starknet-devnet)
echo "starknet-devnet at: $STARKNET_DEVNET_PATH"

echo "starting rust install"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
echo "installed rust"

echo "starting cairo-rs-py install"
pip3 install cairo-rs-py
echo "installed cairo-rs-py"
