#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/my-starknet-sources/contract.cairo/ --starknet-network alpha --inputs 10
