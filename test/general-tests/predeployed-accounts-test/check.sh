#!/bin/bash
set -e

npx hardhat test --no-compile test/get-predeployed-accounts.test.ts
