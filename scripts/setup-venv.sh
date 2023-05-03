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
    GMP_VERSION=$(brew ls --versions gmp)
    GMP_VERSION=(${GMP_VERSION// / }) # Splitting by space from "gmp 6.2.1_1"
    GMP_VERSION=${GMP_VERSION[1]} # Take only the version
    GMP_DIR=$(brew --prefix gmp)/$GMP_VERSION
    echo "$GMP_DIR"
    CFLAGS=-I$GMP_DIR/include LDFLAGS=-L$GMP_DIR/lib pip3 install fastecdsa
fi

if [ "$TEST_SUBDIR" == "venv-tests" ]; then
    which "$VENV/bin/starknet" || pip3 install cairo-lang=="$(cat /tmp/cairo-lang-version)"
    echo "starknet at: $(which starknet)"
    echo "starknet version: $(starknet --version)"
fi
