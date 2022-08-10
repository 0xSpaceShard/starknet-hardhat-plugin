#!/bin/bash
set -e

# Check if plugin version returns the correct version
PLUGIN_VERSION=$(jq -r ".version" package.json)
echo "Plugin version: $PLUGIN_VERSION"
npx hardhat starknet-plugin-version 2>&1 |
    ../scripts/assert-contains.py "Version: $PLUGIN_VERSION"
