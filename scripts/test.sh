#!/bin/bash
set -eu

trap 'for killable in $(jobs -p); do kill -9 $killable; done' EXIT

CONFIG_FILE_NAME="hardhat.config.ts"

./scripts/ensure-python.sh

# setup example repo
rm -rf starknet-hardhat-example
EXAMPLE_REPO_BRANCH="plugin"
if [[ "$CIRCLE_BRANCH" == "master" ]] && [[ "$EXAMPLE_REPO_BRANCH" != "plugin" ]]; then
    echo "Invalid example repo branch: $EXAMPLE_REPO_BRANCH"
    exit 1
fi

git clone -b "$EXAMPLE_REPO_BRANCH" --single-branch git@github.com:Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
git log -n 1
npm ci
npm install ../ # install plugin from source (parent dir)

# if docker is available on the system pull docker image
CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG=$(node -e "console.log(require('../dist/src/constants.js').CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG)")

if docker --version >/dev/null 2>&1; then
    docker pull "$CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG"
fi

# used by some cases
../scripts/setup-venv.sh

total=0
success=0

test_dir="../test/$TEST_SUBDIR"

if [ ! -d "$test_dir" ]; then
    echo "Invalid test directory: $test_dir"
    exit -1
fi

function iterate_dir() {
    network="$1"
    echo "Starting tests on $network"
    for test_case in "$test_dir"/*; do
        test_name=$(basename $test_case)

        network_file="$test_case/network.json"

        if [[ ! -f "$network_file" ]]; then
            echo "Test failed! Error: No network file provided!"
            total=$((total + 1))
            continue
        fi

        # Skip if the network file doesn't specify to run the test on the current network
        if [[ $(jq .[\""$network"\"] "$network_file") != true ]]; then
            echo "Skipping $network test for $test_name"
            continue
        fi

        total=$((total + 1))
        echo "Test $total) $test_name"

        config_file_path="$test_case/$CONFIG_FILE_NAME"
        if [ ! -f "$config_file_path" ]; then
            echo "Test failed! Error: No config file provided!"
            continue
        fi

        # replace the dummy config (CONFIG_FILE_NAME) with the one used by this test
        /bin/cp "$config_file_path" "$CONFIG_FILE_NAME"

        [ "$network" == "devnet" ] && ../scripts/run-devnet.sh

        # check if test_case/check.ts exists
        if [ -f "$test_case/check.ts" ]; then
            # run the test
            NETWORK="$network" npx ts-node "$test_case/check.ts" && success=$((success + 1)) || echo "Test failed!"
        else
            echo "Error: $test_case/check.ts not found"
        fi

        rm -rf starknet-artifacts
        git checkout --force
        git clean -fd
        # specifying signal for pkill fails on mac
        [ "$network" == "devnet" ] && pkill -f starknet-devnet && sleep 5

        echo "----------------------------------------------"
        echo
    done
    echo "Finished tests on $network"
}

# perform tests on Alpha-goerli testnet only on master branch and in a linux environment
# skip testing on testnet if [skip testnet] included in commit message
latest_commit_msg=$(git log -1 --pretty=%B)
if [[ "$CIRCLE_BRANCH" == "master" ]] &&
    [[ "$OSTYPE" == "linux-gnu"* ]] &&
    [[ "$latest_commit_msg" != *"[skip testnet]"* ]]; then
    source ../scripts/set-alpha-vars.sh
    iterate_dir alpha
fi

../scripts/install-devnet.sh

# test integrated devnet
source ../scripts/set-devnet-vars.sh
iterate_dir integrated-devnet

iterate_dir devnet

echo "Tests passing: $success / $total"
exit $((total - success))
