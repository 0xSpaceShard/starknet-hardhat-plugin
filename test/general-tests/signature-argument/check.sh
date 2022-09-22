#!/bin/bash

set -e

signature_len=6
signature="1 2 3 4 5 6"

# compile signatures contract
npx hardhat starknet-compile contracts/signatures.cairo

# deploy contract
output=$(npx hardhat starknet-deploy --wait --starknet-network "$NETWORK" starknet-artifacts/contracts/signatures.cairo/)
echo $output

address=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")
echo "Address: $address"

output_after_invoke=$(npx hardhat starknet-call \
    --contract "signatures" --address "$address" \
    --function "get_signature_len" --starknet-network "$NETWORK" \
    --signature "$signature" \
    | sed -n 2p)


if [[ $output_after_invoke != "$signature_len" ]]; then
    echo "Call output does not contain correct signature length"
    echo "Expected: $signature_len"
    echo "Actual: $output_after_invoke"
    exit 1
fi
