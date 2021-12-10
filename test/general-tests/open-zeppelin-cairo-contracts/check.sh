#!/bin/bash
set -e

git clone git@github.com:OpenZeppelin/cairo-contracts.git
rm -rf contracts
mv cairo-contracts/contracts contracts

npx hardhat starknet-compile contracts/Ownable.cairo
