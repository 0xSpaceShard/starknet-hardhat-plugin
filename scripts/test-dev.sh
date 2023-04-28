#!/bin/bash

DEVNET_CONTAINER_NAME="starknet_hardhat_devnet"

# shut down container on exit
trap "
    echo 'Stopping Devnet'
    docker rm -f $DEVNET_CONTAINER_NAME
" EXIT

# Flag: dev mode for testing (and not usual CI)
export STARKNET_HARDHAT_DEV=1
export STARKNET_HARDHAT_DEV_NETWORK="integrated-devnet"

cd test

# Loops until a suitable TEST_SUBDIR is provided
TEST_SUBDIR_PENDING="true"
while [[ -n $TEST_SUBDIR_PENDING ]]; do
    echo "(Tab to autocomplete)"
    read -e -p "Test suite: " TEST_SUBDIR
    TEST_SUBDIR="${TEST_SUBDIR%/}"

    if [[ -d $TEST_SUBDIR ]]; then
        if [[ $TEST_SUBDIR != "${TEST_SUBDIR%-tests}" ]]; then
            TEST_SUBDIR_PENDING=""
        fi
    else
        echo ""
        echo "Please pick from,"
        ls | grep '\-tests' | awk '{print " - "$1}'
        echo ""
    fi
done

TEST_SUBDIR="${TEST_SUBDIR%/}" # remove trailing slash

cd $TEST_SUBDIR

# Loops until a suitable test_name is provided
TEST_NAME_PENDING="true"
while [[ -n $TEST_NAME_PENDING ]]; do
    echo ""
    echo "(Tab to autocomplete)"
    read -e -p "Test: " test_name
    test_name="${test_name%/}"

    if [[ -d $test_name ]]; then
        echo "Running test $test_name from $TEST_SUBDIR"
        TEST_NAME_PENDING=""
    else
        echo "Please pick from,"
        ls | awk '{print " - "$1}'
        echo ""
    fi
done

cd ../..

test_name="${test_name%/}" # remove trailing slash
RUN_SETUP="y"
CONFIG_FILE_NAME="hardhat.config.ts"

if [[ -d starknet-hardhat-example/ ]]; then
    echo ""
    read -e -p "Example repo found, y to force run setup: " RUN_SETUP
fi

if [[ "y" == "$RUN_SETUP" ]]; then
    echo ""
    source ./scripts/setup-cairo1-compiler.sh
    rm -rf starknet-hardhat-example
    git clone -b "${EXAMPLE_REPO_BRANCH:=plugin}" --single-branch https://github.com/0xSpaceShard/starknet-hardhat-example.git
    cd starknet-hardhat-example
    npm ci
    npm install ../ # install plugin from source (parent dir)
    cd ..
else
    echo "Skipped setup."
fi

pwd

echo ""
echo "If your test needs devnet (and not integrated-devnet),"
read -e -p "y to run devnet: " RUN_DEVNET

if [[ "y" == "$RUN_DEVNET" ]]; then
    export STARKNET_HARDHAT_DEV_NETWORK="devnet"
    ./scripts/devnet-run.sh
    echo ""
    echo "Devnet running, to stop devnet use:"
    echo "+--------------------------------------+"
    echo "| docker rm -f $DEVNET_CONTAINER_NAME |"
    echo "+--------------------------------------+"
fi

while [[ "y" = "${CONTINUE_TESTING:-y}" ]]; do
    echo ""
    echo "Loading your latest code changes"
    cd starknet-hardhat-example
    npm install ../ # install plugin from source (parent dir)
    cd ..

    echo ""
    TEST_SUBDIR=$TEST_SUBDIR ./scripts/test.sh $test_name
    echo ""
    echo "----------------------------------------------"
    echo ""
    read -e -p "Re-run the test? (Y/n) " CONTINUE_TESTING
done
