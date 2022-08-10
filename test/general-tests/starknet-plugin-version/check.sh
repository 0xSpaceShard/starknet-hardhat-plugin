#!/bin/bash
set -e

# Check if plugin version returns the correct version
PLUGIN_VERSION=$(npm view @shardlabs/starknet-hardhat-plugin dist-tags.latest)
echo "Plugin version: $PLUGIN_VERSION"
npx hardhat starknet-plugin-version 2>&1 |
    ../scripts/assert-contains.py "Version: $PLUGIN_VERSION"
