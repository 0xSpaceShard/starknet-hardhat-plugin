#!/bin/bash
set -e

check_devnet_is_not_running() {
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5050/feeder_gateway/is_alive") || echo "Devnet is not running! $status"

    if [ "$status" != 000 ]; then
        echo "Devnet is running and responded with status $status"
        exit 1
    fi
}
