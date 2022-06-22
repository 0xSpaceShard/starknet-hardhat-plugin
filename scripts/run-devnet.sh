#!/bin/bash

# This script starts devnet in background and checks until it is responsive.
# Outputs the PID of the bg process.

set -e

HOST=127.0.0.1
PORT=5050

starknet-devnet --host $HOST --port $PORT --seed 42 > /dev/null 2>&1 &
echo $!

curl --retry 20 --retry-delay 1 --retry-connrefused -s -o /dev/null "$HOST:$PORT/is_alive"
