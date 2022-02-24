#!/bin/bash
set -e

LOCAL_VERSION=$(jq -r ".version" package.json)
NPM_VERSION=$(npm view @shardlabs/starknet-hardhat-plugin dist-tags.latest)

if [ $LOCAL_VERSION = $NPM_VERSION ]; then
  echo "Latest npm version is equal to current package version. Up the version to publish to npm."
else
  npm install
  npm run build
  npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
  npm publish --verbose --access=public
fi
