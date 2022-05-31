#!/bin/bash
set -e

npx hardhat test --no-compile test/devnet-time-test.ts
