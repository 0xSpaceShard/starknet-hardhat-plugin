#!/bin/bash
set -eu

LOCAL_VERSION=$(jq -r ".version" package.json)
NPM_VERSION=$(npm view @shardlabs/starknet-hardhat-plugin dist-tags.latest)

if [ $LOCAL_VERSION = $NPM_VERSION ]; then
  echo "Latest npm version is equal to current package version. Up the version to publish to npm."
else
  npm ci
  npm run build
  # NPM access token: https://docs.npmjs.com/creating-and-viewing-access-tokens
  npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
  npm publish --verbose --access=public
fi
