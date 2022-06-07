#!/bin/bash
set -e

CONTRACT_NAME=contract_test_cache.cairo
CONTRACT_PATH="contracts/${CONTRACT_NAME}"

rm -rf contracts/dependency.cairo contracts/contract_test_cache.cairo
# Hardhat test command
echo "Testing Recompilation with new contract added"
cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with artifacts deleted"
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with updated contract"
# Appending a new function to the contract
cat get_balance.cairo >> contracts/contract_test_cache.cairo
npx hardhat test test/recompilation/recompilation-update-test.ts

echo "Testing Recompilation with cache file deleted"
rm -rf cache/cairo-files-cache.json
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with dependency changed"
echo "#" >> contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-dependency-test.ts

echo "Testing Recompilation one contract added another deleted"
rm -f contracts/contract_test_cache.cairo
# contract_test contract with original content
cp "$(dirname "$0")/$CONTRACT_NAME" "$CONTRACT_PATH"
rm -f contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts
