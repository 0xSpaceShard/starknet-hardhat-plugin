#!/bin/bash
set -e

lsof -i :5050
npx hardhat test --no-compile test/get-predeployed-accounts.test.ts
