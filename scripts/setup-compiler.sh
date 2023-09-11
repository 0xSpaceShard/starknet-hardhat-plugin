#!/bin/bash

set -eu

CAIRO_COMPILER_TARGET_TAG=$CAIRO_COMPILER
echo "Installing cairo compiler $CAIRO_COMPILER_TARGET_TAG"

CAIRO_COMPILER_ASSET_NAME="release-x86_64-unknown-linux-musl.tar.gz"

if [[ "$OSTYPE" == "darwin"* ]]; then
    CAIRO_COMPILER_ASSET_NAME="release-aarch64-apple-darwin.tar"
fi

# Download compiler asset
COMPILER_BINARY_URL="https://github.com/starkware-libs/cairo/releases/download/v$CAIRO_COMPILER_TARGET_TAG/$CAIRO_COMPILER_ASSET_NAME"
echo "Downloading $COMPILER_BINARY_URL"
curl --location -O "$COMPILER_BINARY_URL"

# Unpack and remove archive
tar -zxvf "$CAIRO_COMPILER_ASSET_NAME"
rm -rf "$CAIRO_COMPILER_ASSET_NAME"

# For verification and future use
# Using absolute path to make it usable everywhere
export CAIRO_1_COMPILER_DIR=$(readlink -f "cairo/bin")

# Verify
echo "Verifying compiler binaries"
$CAIRO_1_COMPILER_DIR/starknet-compile --version
$CAIRO_1_COMPILER_DIR/starknet-sierra-compile --version
