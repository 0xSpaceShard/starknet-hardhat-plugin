#!/bin/bash

set -e

signature_len=6
signature="1 2 3 4 5 6"

# compile signatures contract
npx hardhat starknet-compile contracts/signatures.cairo

# deploy contract
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/signatures.cairo/)
echo $output

address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")


echo "Address: $address"

# test call
call_output=$(npx hardhat starknet-call \
    --contract "signatures" --address "$address" \
    --function "get_signature" --starknet-network "$NETWORK" \
    --signature "$signature")

echo $call_output

if [[ "$call_output" != *"$signature_len $signature"* ]]; then
    echo "Call output does not contain correct length and signature"
    exit 1
fi

# test invoke
invoke_output=$(npx hardhat starknet-call \
    --contract "signatures" --address "$address" \
    --function "get_signature" --starknet-network "$NETWORK" \
    --signature "$signature")

if [[ "$invoke_output" != *"$signature_len $signature"* ]]; then
    echo "Invoke output does not contain correct length and signature"
    exit 1
fi
