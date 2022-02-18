#!/bin/bash
set -e

cd ..

# The config file used for running mocha tests is the one in root

npx hardhat test --no-compile test/general-tests/short-string-test/short-string-test.ts
