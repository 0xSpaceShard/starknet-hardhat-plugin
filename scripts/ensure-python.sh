#!/bin/bash

set -e

PY_VERSION=3.8.9

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    which "/opt/circleci/.pyenv/versions/$PY_VERSION/bin/python" || pyenv install "$PY_VERSION"
    pyenv global "$PY_VERSION"
fi
