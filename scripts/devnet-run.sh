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

echo "Waiting for devnet... "
sleep 1
for ((i = 0 ; i < 35 ; i++)); do
    echo -ne "\r $((i+1)) "
    
    if is_alive=$(curl -s -w "\n" "http://$HOST:$PORT/is_alive"); then
        echo "$is_alive"
        break
    else
        sleep 1
    fi
done

if [[ $i -ge 35 ]]; then
    echo "Failed to run devnet :("
    exit 1
fi
