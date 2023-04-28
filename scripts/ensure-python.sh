#!/bin/bash

# Ensures that pyenv uses the desired Python version (on Linux).

set -eu

PY_VERSION=3.9.10

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    which "/opt/circleci/.pyenv/versions/$PY_VERSION/bin/python" || pyenv install "$PY_VERSION"
    pyenv global "$PY_VERSION"
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    which "/Users/distiller/.pyenv/versions/$PY_VERSION/bin/python" || pyenv install "$PY_VERSION"
    pyenv global "$PY_VERSION"
fi
