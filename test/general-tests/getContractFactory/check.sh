#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat test --no-compile test/path-test.ts
