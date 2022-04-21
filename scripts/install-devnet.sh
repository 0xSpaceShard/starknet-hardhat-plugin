#!/bin/bash

set -e

DEVNET_VERSION=$(../scripts/get-version.py starknet-devnet)
pip3 install "starknet-devnet==$DEVNET_VERSION"
