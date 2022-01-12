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
    which starknet || pip3 install cairo-lang==0.6.2
    echo "starknet at: $(which starknet)"
    echo "starknet version: $(starknet --version)"
fi
