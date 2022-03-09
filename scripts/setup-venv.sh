#!/bin/bash

set -e

VENV=../my-venv

echo "Creating venv $(pwd)/$VENV"
python3 -m venv "$VENV"
source "$VENV/bin/activate"
echo "python at: $(which python)"
echo "python version: $(python --version)"

if [[ "$OSTYPE" == "darwin"* ]]; then
    export HOMEBREW_NO_INSTALL_CLEANUP=1
    brew ls --versions gmp || brew install gmp
fi

if [ -z "$TEST_SUBDIR" ]; then
    echo "Missing TEST_SUBDIR env var"
    exit 1
fi

if [ "$TEST_SUBDIR" == "venv-tests" ]; then
    which "$VENV/bin/starknet" || pip3 install cairo-lang=="$(cat /tmp/cairo-lang-version)"
    echo "starknet at: $(which starknet)"
    echo "starknet version: $(starknet --version)"
fi

if [ "$TEST_SUBDIR" == "integrated-devnet-tests" ]; then
    which "$VENV/bin/starknet-devnet" || pip3 install starknet-devnet
    echo "starknet-devnet at: $(which starknet-devnet)"
    echo "starknet-devnet version: $(starknet-devnet --version)"
fi

