#!/bin/bash
set -e

npx hardhat starknet-compile
npx hardhat test test/path-test.ts
