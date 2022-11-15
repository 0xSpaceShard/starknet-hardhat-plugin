#!/bin/bash
set -eu

source ./scripts/run-devnet.sh # sets DEVNET_PID env var
echo "Done 1"
ps

echo "Killing $DEVNET_PID"
kill -9 "$DEVNET_PID"
ps

echo "Ready to execute another test?"
