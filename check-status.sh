#!/bin/bash

# Used in Docker image

MSG="$0 <TX_ID> <NETWORK> [TIMEOUT]"

TX_ID=$1
if [ -z $TX_ID ]; then
    echo $MSG
    exit 1
fi

NETWORK=$2
if [ -z $NETWORK ]; then
    echo $MSG
    exit 2
fi

TIMEOUT="${3:-1}"

while true; do
    STATUS=$(starknet tx_status --id $TX_ID --network $NETWORK | jq -r .tx_status)
    if [ "$STATUS" = "PENDING" ]\
    || [ "$STATUS" = "ACCEPTED_ONCHAIN" ]\
    || [ "$STATUS" = "REJECTED" ]
    then
        echo -n $STATUS
        break
    fi

    sleep $TIMEOUT
done
