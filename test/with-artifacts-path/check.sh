#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat starknet-deploy --starknet-network alpha my-starknet-artifacts/contracts/contract.cairo/
rm -rf my-starknet-artifacts
