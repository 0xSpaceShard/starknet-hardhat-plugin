#!/bin/bash
set -e

cd ..
npx hardhat test test/general-tests/short-string-test/short-string-test.ts
