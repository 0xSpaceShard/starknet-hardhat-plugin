#!/bin/bash
set -e

rm -rf starknet-hardhat-example
git clone git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
npm install

TOTAL=0
SUCCESS=0
for TEST_CASE in ../test/*; do
    CONFIG_FILE="$TEST_CASE/hardhat.config.ts"
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Skipping; no config file provided"
        continue
    fi
    /bin/cp "$CONFIG_FILE" hardhat.config.ts

    TEST_NAME=$(basename $TEST_CASE)
    TOTAL=$((TOTAL + 1))
    echo "Test $TOTAL) $TEST_NAME"

    INIT_SCRIPT="$TEST_CASE/init.sh"
    if [ -f "$INIT_SCRIPT" ]; then
        $INIT_SCRIPT
    fi

    "$TEST_CASE/check.sh" && SUCCESS=$((SUCCESS + 1)) || echo "Test failed!"

    git checkout --force
    git clean -fd
    echo "----------------------------------------------"
    echo
done

echo "Tests passing: $SUCCESS / $TOTAL"
exit $((TOTAL - SUCCESS))
