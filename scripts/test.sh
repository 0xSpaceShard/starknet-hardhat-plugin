#!/bin/bash
set -e

CONFIG_FILE_NAME="hardhat.config.ts"

# setup example repo
rm -rf starknet-hardhat-example
git clone -b plugin --single-branch git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
git log -n 1
npm install

# used by some cases
../scripts/setup-venv.sh

total=0
success=0
for test_case in "../test/$npm_config_dirname/"; do
    total=$((total + 1))
    test_name=$(basename $test_case)
    echo "Test $total) $test_name"

    config_file_path="$test_case/$CONFIG_FILE_NAME"
    if [ ! -f "$config_file_path" ]; then
        echo "No config file provided!"
        continue
    fi

    # replace the dummy config (CONFIG_FILE_NAME) with the one used by this test
    /bin/cp "$config_file_path" "$CONFIG_FILE_NAME"

    "$test_case/check.sh" && success=$((success + 1)) || echo "Test failed!"

    rm -rf starknet-artifacts
    git checkout --force
    git clean -fd
    echo "----------------------------------------------"
    echo
done

echo "Tests passing: $success / $total"
exit $((total - success))
