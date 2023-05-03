#!/bin/bash
HOST=127.0.0.1
PORT=5050

echo "Emptying state on Devnet at $HOST:$PORT"

curl -X POST "http://$HOST:$PORT/restart"
