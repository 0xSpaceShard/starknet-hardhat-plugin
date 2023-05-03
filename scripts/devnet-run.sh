#!/bin/bash

# This script starts devnet in background and checks until it is responsive.
# Outputs the PID of the bg process.

set -eu

HOST=127.0.0.1
PORT=5050

if [[ -n "${STARKNET_HARDHAT_DEV:-}" ]]; then
    echo "Running dockerized Devnet..."
    # Get default from config.json file
    # We may be inside example dir or main plugin dir
    # This script needs to be generic and work in both cases
    if [[ -e "./config.json" ]]; then
        STARKNET_DEVNET_DEFAULT=$(node -e "console.log(require('./config.json').STARKNET_DEVNET)")
    else
        STARKNET_DEVNET_DEFAULT=$(node -e "console.log(require('../config.json').STARKNET_DEVNET)")
    fi

    STARKNET_DEVNET="${STARKNET_DEVNET:=$STARKNET_DEVNET_DEFAULT}"
    docker pull -q shardlabs/starknet-devnet:$STARKNET_DEVNET
    container_id=$(docker run --rm --name starknet_hardhat_devnet -d -p 0.0.0.0:$PORT:$PORT shardlabs/starknet-devnet --seed 42)
    echo "Running devnet in container starknet_hardhat_devnet $container_id"

else
    starknet-devnet --host $HOST --port $PORT --seed 42 >/dev/null 2>&1 &
    echo "Spawned devnet with PID $!"
fi

# Display the fact that devnet is loading by rotating a straight line |
loading_chars=("|" "/" "-" "\\")
total_loading_chars=${#loading_chars[@]}

sleep 1
MAX_WAIT=35 # seconds
for ((i = 0; i < $MAX_WAIT; i++)); do
    loading_char_i=$((i % total_loading_chars))
    loading_char=${loading_chars[$loading_char_i]}""
    echo -ne "\r Spawning Devnet $loading_char"

    if is_alive=$(curl -s -w "\n" "http://$HOST:$PORT/is_alive"); then
        echo ""
        echo "$is_alive"
        break
    else
        sleep 1
    fi
done

if [[ $i -ge "$MAX_WAIT" ]]; then
    echo "Failed to run devnet :("
    exit 1
fi
