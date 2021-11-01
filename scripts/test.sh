#!/bin/bash
set -e

rm -rf starknet-hardhat-example
git clone git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
npm install

CONFIG_FILE_NAME="hardhat.config.ts"

TOTAL=0
SUCCESS=0
for TEST_CASE in ../test/*; do
    TOTAL=$((TOTAL + 1))
    TEST_NAME=$(basename $TEST_CASE)
    echo "Test $TOTAL) $TEST_NAME"

    CONFIG_FILE_PATH="$TEST_CASE/$CONFIG_FILE_NAME"
    if [ ! -f "$CONFIG_FILE_PATH" ]; then
        echo "No config file provided!"
        continue
    fi

    #replace the dummy config (config_file_name) with the one of this test (config_file_path)
    /bin/cp "$CONFIG_FILE_PATH" "$CONFIG_FILE_NAME"

    INIT_SCRIPT="$TEST_CASE/init.sh"
    if [ -f "$INIT_SCRIPT" ]; then
        $INIT_SCRIPT
    fi

    "$TEST_CASE/check.sh" && SUCCESS=$((SUCCESS + 1)) || echo "Test failed!"

    rm -rf starknet-artifacts
    git checkout --force
    git clean -fd
    echo "----------------------------------------------"
    echo
done

echo "Tests passing: $SUCCESS / $TOTAL"
exit $((TOTAL - SUCCESS))
