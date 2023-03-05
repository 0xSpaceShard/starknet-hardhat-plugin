#!/bin/bash

# Ensures that pyenv uses the desired Python version (on Linux).

set -eu

PY_VERSION=3.8.9

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Install version PY_VERSION, but skip if already installed.
    which "/opt/circleci/.pyenv/versions/$PY_VERSION/bin/python" || pyenv install "$PY_VERSION" -s
    pyenv global "$PY_VERSION"
fi
