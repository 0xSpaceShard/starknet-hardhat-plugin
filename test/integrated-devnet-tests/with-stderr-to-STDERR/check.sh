#!/bin/bash
set -e

source ../scripts/check-devnet-is-not-running.sh

check_devnet_is_not_running

EXPECTED_STDOT="Account #0"
EXPECTED_WARNING="WARNING: Use these accounts and their keys ONLY for local testing. DO NOT use them on mainnet or other live networks because you will LOSE FUNDS."

npx hardhat starknet-compile contracts/contract.cairo

npx hardhat test --no-compile test/integrated-devnet.test.ts 2>&1 | 
    ../scripts/assert-contains.py "$EXPECTED_WARNING"


# Checks if file logs/stdout.log exists and contains the expected warning string
if [ -f logs/stdout.log ]; then
    if ! grep -q "$EXPECTED_STDOT" logs/stdout.log; then
        echo "Expected warning to contain '$EXPECTED_STDOT'"
        exit 1
    fi
else
    echo "Expected logs/stdout.log to exist"
    exit 1
fi

echo "Success"
check_devnet_is_not_running
