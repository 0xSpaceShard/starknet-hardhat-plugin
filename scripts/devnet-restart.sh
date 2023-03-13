#!/bin/bash
HOST=127.0.0.1
PORT=5050

if [[ -n "${STARKNET_HARDHAT_RUNNING_DIND:-}" ]]; then
	HOST=host.docker.internal
fi

echo "Restarting Devnet: $HOST:$PORT"

curl -X POST "http://$HOST:$PORT/restart"