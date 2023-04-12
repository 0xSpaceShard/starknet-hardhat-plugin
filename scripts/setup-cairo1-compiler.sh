#!/bin/bash

set -eu

if [ "$TEST_SUBDIR" == "configuration-tests" ]; then
    CAIRO_1_COMPILER_TARGET_TAG="v1.0.0-alpha.6"

    echo "Installing cairo compiler $CAIRO_1_COMPILER_TARGET_TAG"
    # need rust to install cairo-rs-py
    if rustc --version; then
        echo "rustc installed"
    else
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
    fi

    if [ -z "${CAIRO_1_COMPILER_MANIFEST+x}" ]; then
        # setup cairo1 compiler
        mkdir cairo-compiler
        git clone git@github.com:starkware-libs/cairo.git cairo-compiler \
            --branch $CAIRO_1_COMPILER_TARGET_TAG \
            --single-branch
        CAIRO_1_COMPILER_MANIFEST="cairo-compiler/Cargo.toml"

        # needed by further testing steps
        echo "export CAIRO_1_COMPILER_MANIFEST=$CAIRO_1_COMPILER_MANIFEST" >>"$BASH_ENV"
        echo "source ~/.cargo/env" >>"$BASH_ENV"
    fi
fi
