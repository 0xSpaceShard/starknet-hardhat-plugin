#!/bin/bash
set -e

npx hardhat test --no-compile test/devnet-create-block-test.ts
