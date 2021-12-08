#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat test test/sample-test.ts
