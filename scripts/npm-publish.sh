#!/bin/bash
set -e

CORE_LOCAL_VERSION=$(jq -r ".version" package.json)
CORE_NPM_VERSION=$(npm view @shardlabs/starknet-hardhat-plugin dist-tags.latest)

if [ $CORE_LOCAL_VERSION = $CORE_NPM_VERSION ]; then
  echo "Latest npm version is equal to current package version. Up the version to publish to npm."
else
  npm install
  npm run build
  npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
  npm publish --verbose --access=public
fi
