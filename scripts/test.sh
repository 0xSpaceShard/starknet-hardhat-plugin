#!/bin/bash
set -eu

if [[ -z "${STARKNET_HARDHAT_DEV:-}" ]]; then
	./scripts/test-setup.sh
	./scripts/install-devnet.sh
fi

cd ./starknet-hardhat-example

total=0
success=0

CONFIG_FILE_NAME="hardhat.config.ts"
test_dir="../test/$TEST_SUBDIR"
test_name_specified=${1:-}

if [ ! -d "$test_dir" ]; then
    echo "Invalid test directory: $test_dir"
    exit -1
fi

function run_test() {
    test_case="$1"
 	network="${2:-}"
 	test_name=$(basename $test_case)

    network_file="$test_case/network.json"

    [ "$network" == "devnet" ] && ../scripts/devnet-restart.sh

    if [[ ! -f "$network_file" ]]; then
        echo "Test failed! Error: No network file provided!"
        total=$((total + 1))
        return 0
    fi

	# If network is provided
	if [[ -n $network ]]; then
	    # Skip if the network file doesn't specify to run the test on the current network
		if [[ $(jq .[\""$network"\"] "$network_file") != true ]]; then
			echo "Skipping $network test for $test_name"
			return 0
		fi
    fi

    total=$((total + 1))
    echo "Test $total) $test_name"

    config_file_path="$test_case/$CONFIG_FILE_NAME"
    if [ ! -f "$config_file_path" ]; then
        echo "Test failed! Error: No config file provided!"
        return 0
    fi

    # replace the dummy config (CONFIG_FILE_NAME) with the one used by this test
    /bin/cp "$config_file_path" "$CONFIG_FILE_NAME"

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

    echo "----------------------------------------------"
    echo
}

function iterate_dir() {
    network="$1"
    echo "Starting tests on $network"

    [ "$network" == "devnet" ] && ../scripts/devnet-run.sh

	if [[ -n $test_name_specified ]]; then
		test_case_dir="$test_dir/$test_name_specified"
		if [ ! -d "$test_case_dir" ]; then
			echo "Invalid directory $test_case_dir for test case $test_name_specified"
			exit -1
		fi

		run_test $test_case_dir $network
	else
		for test_case in "$test_dir"/*; do
			run_test $test_case $network
		done
	fi

    # specifying signal for pkill fails on mac
    [ "$network" == "devnet" ] && ../scripts/devnet-stop.sh && sleep 5

    echo "Finished tests on $network"
}

# perform tests on Alpha-goerli testnet only on master branch and in a linux environment
# skip testing on testnet if [skip testnet] included in commit message
latest_commit_msg=$(git log -1 --pretty=%B)
if [[ "${CIRCLE_BRANCH:=}" == "master" ]] &&
    [[ "$OSTYPE" == "linux-gnu"* ]] &&
    [[ "$latest_commit_msg" != *"[skip testnet]"* ]]; then
    source ../scripts/set-alpha-vars.sh
    iterate_dir alpha
fi

source ../scripts/set-devnet-vars.sh

if [[ -z "${STARKNET_HARDHAT_DEV:-}" ]]; then
	# test integrated devnet
	iterate_dir integrated-devnet

	iterate_dir devnet
else
	test_case_dir="$test_dir/$test_name_specified"
	if [ ! -d "$test_case_dir" ]; then
		echo "Invalid directory $test_case_dir for test case $test_name_specified"
		exit -1
	fi
	run_test $test_case_dir
fi

echo "Tests passing: $success / $total"
exit $((total - success))
