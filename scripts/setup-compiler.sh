#!/bin/bash

set -eu

CAIRO_COMPILER_TARGET_TAG=$CAIRO_COMPILER
echo "Installing cairo compiler $CAIRO_COMPILER_TARGET_TAG"

CAIRO_COMPILER_ASSET_NAME="release-x86_64-unknown-linux-musl.tar.gz"

if [[ "$OSTYPE" == "darwin"* ]]; then
    CAIRO_COMPILER_ASSET_NAME="release-aarch64-apple-darwin.tar"
fi

COMPILER_BINARY_URL="https://github.com/starkware-libs/cairo/releases/download/v$CAIRO_COMPILER_TARGET_TAG/$CAIRO_COMPILER_ASSET_NAME"

if [ -z "${CAIRO_1_COMPILER_DIR+x}" ]; then
    # Setup cairo1 compiler
    echo $COMPILER_BINARY_URL
    mkdir -p cairo-compiler/target/release
    curl --location -O --request GET "$COMPILER_BINARY_URL"
    # Unzip asset and move to correct target
    tar -zxvf $CAIRO_COMPILER_ASSET_NAME -C cairo-compiler --strip-components=1
    mv cairo-compiler/bin/* cairo-compiler/target/release/ # TODO unnecessarily complicated path
    mv cairo-compiler/corelib cairo-compiler/target/corelib
    # Remove empty directory and asset
    rm -rf $CAIRO_COMPILER_ASSET_NAME cairo-compiler/bin
    export CAIRO_1_COMPILER_DIR="$(readlink -f "cairo-compiler/target/release")"
fi

$CAIRO_1_COMPILER_DIR/starknet-compile --version
