#!/bin/bash

set -e

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    which /opt/circleci/.pyenv/versions/3.8.9/bin/python3.8 || pyenv install 3.8.9
    pyenv global 3.8.9
fi

curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python3 - --version 1.1.12

git clone -b master --single-branch git@github.com:Shard-Labs/starknet-devnet.git

source "$HOME/.poetry/env"

cd starknet-devnet 
poetry env use "$(which python)"
poetry build
pip3 install dist/starknet_devnet-*-py3-none-any.whl
cd ..
