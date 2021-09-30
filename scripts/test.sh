#!/bin/bash
set -e

rm -rf starknet-hardhat-example
git clone git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
npm install

TOTAL=0
SUCCESS=0
for TEST_CASE in ../test/*; do
    TOTAL=$((TOTAL + 1))
    echo "Test $TOTAL) $TEST_CASE"
    /bin/cp "$TEST_CASE/hardhat.config.js" hardhat.config.js

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
