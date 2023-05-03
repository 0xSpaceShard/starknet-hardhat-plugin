#!/bin/bash

if [[ -n "${STARKNET_HARDHAT_DEV:-}" ]]; then
    # Stop docker devnet container
    docker rm -f starknet_hardhat_devnet
else
    # Kill devnet process
    # specifying signal for pkill fails on mac
    pkill -f starknet-devnet
fi
