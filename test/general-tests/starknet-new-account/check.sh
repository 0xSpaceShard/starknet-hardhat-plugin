#!/bin/bash

set -eu

npx hardhat starknet-new-account --wallet OpenZeppelin --starknet-network "$NETWORK"
