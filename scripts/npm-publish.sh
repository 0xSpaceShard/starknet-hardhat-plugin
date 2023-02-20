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

  # publish docs
  cd www && npm ci

  git config --global user.email "$GIT_USER@users.noreply.github.com"
  git config --global user.name "$GIT_USER"
  echo "machine github.com login $GIT_USER password $GITHUB_TOKEN" >~/.netrc

  # skip ci to avoid gh-pages erroring on circleci
  LATEST_COMMIT_HASH=$(git rev-parse HEAD)
  CUSTOM_COMMIT_MESSAGE="Deploy website - based on $LATEST_COMMIT_HASH [skip ci]" \
    npm run deploy
fi
