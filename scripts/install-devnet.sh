#!/bin/bash

set -e

pip3 install starknet-devnet==$(../scripts/get-version.py starknet-devnet)
