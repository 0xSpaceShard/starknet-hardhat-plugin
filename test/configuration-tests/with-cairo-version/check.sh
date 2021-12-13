#!/bin/bash
set -e 

npx hardhat starknet-compile contracts/contract.cairo
npx hardhat starknet-deploy contracts/contract.cairo --starknet-network alpha --inputs 10
