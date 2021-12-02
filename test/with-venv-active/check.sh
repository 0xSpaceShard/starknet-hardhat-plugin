#!/bin/bash
set -e

source my-venv

INITIAL_VALUE=10

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/contracts/contract.cairo/ --starknet-network alpha --inputs "$INITIAL_VALUE"
