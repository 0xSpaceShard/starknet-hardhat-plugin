#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/test.cairo/ --starknet-network alpha --wait
