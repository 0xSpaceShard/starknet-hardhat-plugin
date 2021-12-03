#!/bin/bash
set -e

mv contracts my-starknet-sources

npx hardhat starknet-compile
npx hardhat starknet-deploy starknet-artifacts/test.cairo/ --starknet-network alpha --wait
