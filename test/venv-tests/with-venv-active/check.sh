#!/bin/bash
set -e

source ../my-venv/bin/activate

INITIAL_VALUE=10

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network $1 --inputs "$INITIAL_VALUE"
