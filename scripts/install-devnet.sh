#!/bin/bash

set -e

curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python - --version 1.1.12

git clone -b master --single-branch git@github.com:Shard-Labs/starknet-devnet.git

source "$HOME/.poetry/env"

cd starknet-devnet 
poetry build
pip3 install dist/starknet_devnet-*-py3-none-any.whl
cd ..
