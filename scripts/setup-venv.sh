#!/bin/bash
set -e

VENV=my-venv

echo "Creating venv $VENV in $(pwd)"
python3 -m venv "$VENV"
source "$VENV/bin/activate"
echo "python at: $(which python)"
echo "python version: $(python --version)"

pip install cairo-lang==0.6.1
echo "starknet at: $(which starknet)"
echo "starknet version: $(starknet --version)"