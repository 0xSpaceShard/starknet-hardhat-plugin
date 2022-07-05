#!/bin/bash
set -e

npx hardhat starknet-compile contracts/events.cairo
npx hardhat test --no-compile test/decode-events.test.ts
