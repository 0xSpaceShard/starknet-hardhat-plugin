#!/bin/bash

set -e

curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python3 - --version 1.1.12

source "$HOME/.poetry/env"

pip install starknet-devnet==0.1.20