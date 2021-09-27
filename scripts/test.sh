#!/bin/bash
set -e

rm -rf starknet-hardhat-example
git clone git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
npm install

for CONFIG in ../test/hardhat-configs/*; do
    echo $CONFIG
    cp $CONFIG hardhat.config.js
    npx hardhat starknet-compile
    npx hardhat starknet-deploy --starknet-network alpha
    npx hardhat test
done
