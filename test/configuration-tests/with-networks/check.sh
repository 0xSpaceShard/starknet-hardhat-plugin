#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
artifact_path=starknet-artifacts/contracts/contract.cairo/

actual_output=$(mktemp)

total_tests=0
successful_tests=0

echo "Testing no starknet network"
npx hardhat starknet-deploy "$artifact_path" --inputs 10 | tail -n +2 > "$actual_output" 2>&1 || echo "Successfully failing"
diff actual_output no-starknet-network.txt

echo "Testing invalid starknet network"
npx hardhat starknet-deploy --starknet-network foo "$artifact_path" --inputs 10 | tail -n +2 > "$actual_output" 2>&1 || echo "Successfully failing"
diff "$actual_output" invalid-starknet-network.txt

echo "Testing starknet network with no url"
npx hardhat starknet-deploy --starknet-network bar "$artifact_path" --inputs 10 | tail -n +2 > "$actual_output" 2>&1 || echo "Successfully failing"
diff "$actual_output" starknet-network-without-url.txt

echo "Testing no mocha network"
NETWORK="" npx hardhat test test/quick-test.ts > "$actual_output" 2>&1 && echo "Succeeding regardless"
diff "$actual_output" no-mocha-network.txt

echo "Testing invalid mocha network"
NETWORK="foo" npx hardhat test test/quick-test.ts > "$actual_output" 2>&1 || echo "Successfully failing"
diff "$actual_output" invalid-mocha-network.txt

echo "Testing mocha network with no url"
NETWORK="bar" npx hardhat test test/quick-test.ts > actual_putput 2>&1 || echo "Successfully failing"
diff "$actual_output" mocha-network-with-no-url.txt

rm "$actual_output"
