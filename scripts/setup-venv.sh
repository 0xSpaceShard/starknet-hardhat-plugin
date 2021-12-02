#!/bin/bash
set -e

VENV=my-venv

echo "Creating venv $VENV  in $pwd"
python -m venv "$VENV"
source "$VENV"
