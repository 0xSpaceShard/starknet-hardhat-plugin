#!/bin/bash
set -e

npx hardhat test --no-compile test/devnet-restart.test.ts
