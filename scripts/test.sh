#!/bin/bash
set -e

trap 'kill $(jobs -p)' EXIT

CONFIG_FILE_NAME="hardhat.config.ts"

./scripts/ensure-python.sh

# setup example repo
rm -rf starknet-hardhat-example
git clone -b adapt-0.9.0 --single-branch git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
git log -n 1
npm install

# if docker is available on the system pull docker image
CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG=$(node -e "console.log(require('../dist/src/constants.js').CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG)")

if docker --version > /dev/null 2>&1; then
  docker pull "$CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG"
fi

# used by some cases
../scripts/setup-venv.sh

total=0
success=0

test_dir="../test/$TEST_SUBDIR"

if [ ! -d "$test_dir" ]; then
    echo "Invalid test directory"
    exit -1
fi

function iterate_dir(){
    network="$1"
    echo "Starting tests on $network"
    for test_case in "$test_dir"/*; do
        test_name=$(basename $test_case)

        # Skip if there is a network file that doesn't specify the current network.
        # So by default, if no network.json, proceed with testing on the current network.
        network_file="$test_case/network.json"

        if [[ -f "$network_file" ]] && [[ $(jq .[\""$network"\"] "$network_file") != true ]]; then
            echo "Skipping $network test for $test_name"
            continue
        fi

        total=$((total + 1))
        echo "Test $total) $test_name"

        config_file_path="$test_case/$CONFIG_FILE_NAME"
        if [ ! -f "$config_file_path" ]; then
            echo "Error: No config file provided!"
            continue
        fi

        # replace the dummy config (CONFIG_FILE_NAME) with the one used by this test
        /bin/cp "$config_file_path" "$CONFIG_FILE_NAME"

        NETWORK="$network" "$test_case/check.sh" && success=$((success + 1)) || echo "Test failed!"

        rm -rf starknet-artifacts
        git checkout --force
        git clean -fd
        echo "----------------------------------------------"
        echo
    done
    echo "Finished tests on $network"
}

# perform tests on Alpha-goerli testnet only on master branch and in a linux environment
if [[ "$CIRCLE_BRANCH" == "master" ]] && [[ "$OSTYPE" == "linux-gnu"* ]]; then
    source ../scripts/set-alpha-vars.sh
    iterate_dir alpha
fi

# install and build devnet
../scripts/install-devnet.sh
STARKNET_DEVNET_PATH=$(which starknet-devnet)
echo "starknet-devnet at: $STARKNET_DEVNET_PATH"

# test integrated devnet
iterate_dir integrated-devnet

# run devnet
starknet-devnet --host 127.0.0.1 --port 5050 --seed 42 &

echo "Sleeping and checking if devnet alive"
sleep 10s
curl 127.0.0.1:5050/is_alive

source ../scripts/set-devnet-vars.sh
iterate_dir devnet

echo "Tests passing: $success / $total"
exit $((total - success))
