#!/bin/bash

set -eu

VERSION="$1" # e.g. 0.5.1
GIT_VERSION="v$VERSION"

# create a venv
rm -rf tmp-venv
python3.8 -m venv tmp-venv
source tmp-venv/bin/activate

# create a tmp OZ repo
TMP_REPO="tmp-cairo-contracts" 
rm -rf "$TMP_REPO"
mkdir "$TMP_REPO" && cd "$TMP_REPO"
git clone https://github.com/OpenZeppelin/cairo-contracts/ .
git checkout "$GIT_VERSION"

# install prerequisite
pip install cairo-nile && nile init

# compile the contract
nile compile src/openzeppelin/account/presets/Account.cairo --cairo_path src

# return to project root so that tmp repo can be deleted
cd ..

cp_target="contract-artifacts/OpenZeppelinAccount/$VERSION/Account.cairo/"
mkdir -p "$cp_target"
cp "$TMP_REPO/artifacts/Account.json" "$cp_target/Account.json"
cp "$TMP_REPO/artifacts/abis/Account.json" "$cp_target/Account_abi.json"

rm -rf "$TMP_REPO"
deactivate && rm -rf tmp-venv

# Remove debug_info from the artifact and minify
# Update directory/file names containing the version
# Adapt to ABI changes
# Update expected test paths and addresses
# Update docs
