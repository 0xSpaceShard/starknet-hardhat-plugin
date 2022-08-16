#!/bin/bash

set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat run --no-compile scripts/quick-script.ts --starknet-network "$NETWORK"
