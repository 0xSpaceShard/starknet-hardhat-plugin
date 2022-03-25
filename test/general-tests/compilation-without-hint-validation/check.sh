#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract_with_unwhitelisted_hints.cairo --disable-hint-validation
