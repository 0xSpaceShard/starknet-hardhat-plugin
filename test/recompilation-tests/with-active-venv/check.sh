#!/bin/bash
set -e

rm -rf contracts/dependency.cairo contracts/contract_test.cairo
# Hardhat test command
echo "Testing Recompilation with new contract added"
/bin/cp contract_test.cairo contracts/contract_test.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with artifacts deleted"
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with updated contract"
# Appending a new function to the contract
cat get_balance.cairo >> contracts/contract_test.cairo
npx hardhat test test/recompilation/recompilation-update-test.ts

echo "Testing Recompilation with cache file deleted"
rm -rf cache/cairo-files-cache.json
npx hardhat test test/recompilation/recompilation-main-test.ts

echo "Testing Recompilation with dependency changed"
echo "#" >> contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-dependency-test.ts

echo "Testing Recompilation one contract added another deleted"
rm -f contracts/contract_test.cairo
# contract_test contract with original content
/bin/cp contract_test.cairo contracts/contract_test.cairo
rm -f contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts

# Hardhat starknet-deploy command
echo "Testing Recompilation with deleted artifacts on starknet-deploy"
rm -rf starknet-artifacts/contracts/contract.cairo
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
echo $output

# Hardhat starknet-invoke command
echo "Testing Recompilation with deleted artifacts on hardhat starknet-invoke"
npx hardhat starknet-compile contracts/contract.cairo
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
ADDRESS=$(awk '{for(i=1;i<=NF;i++) {if($i~"address:") {print $(i+1)}}}' <<< "$output")
# Remove artifact contract
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat starknet-invoke --starknet-network "$NETWORK" --contract contract --function increase_balance --address "$ADDRESS" --inputs "10 20"

# Hardhat run command
echo "Testing Recompilation with deleted artifacts on hardhat run"
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat run --no-compile scripts/deploy.ts
