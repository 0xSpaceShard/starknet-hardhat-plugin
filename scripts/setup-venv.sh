#!/bin/bash

set -eu

VENV=../my-venv

echo "Creating venv $(pwd)/$VENV"
python3 -m venv "$VENV"
source "$VENV/bin/activate"
echo "python at: $(which python)"
echo "python version: $(python --version)"

if [[ "$OSTYPE" == "darwin"* ]]; then
    export HOMEBREW_NO_INSTALL_CLEANUP=1
    brew ls --versions gmp || brew install gmp
    CFLAGS=-I`brew --prefix gmp`/include LDFLAGS=-L`brew --prefix gmp`/lib pip3 install fastecdsa
fi

if [ "$TEST_SUBDIR" == "venv-tests" ]; then
    which "$VENV/bin/starknet" || pip3 install cairo-lang=="$(cat /tmp/cairo-lang-version)"
    echo "starknet at: $(which starknet)"
    echo "starknet version: $(starknet --version)"
fi
