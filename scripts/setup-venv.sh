#!/bin/bash
set -e

VENV=my-venv

echo "Creating venv $VENV  in $pwd"
python3 -m venv "$VENV"
source "$VENV/bin/activate"
