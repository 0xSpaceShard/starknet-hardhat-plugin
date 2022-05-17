#!/bin/bash
set -e

rm -f contracts/hello.cairo contracts/dependency.cairo

cat dependency.cairo >> contracts/dependency.cairo

echo "Testing Recompilation with new contract added"
cat hello.cairo >> contracts/hello.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts
echo "Success"

echo "Testing Recompilation with artifacts deleted"
rm -rf starknet-artifacts/contracts/contract.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts
echo "Success"

echo "Testing Recompilation with updated contract"
cat get_balance.cairo >> contracts/hello.cairo
npx hardhat test test/recompilation/recompilation-update-test.ts
echo "Success"

echo "Testing Recompilation with cache file deleted"
rm -rf cache/cairo-files-cache.json
npx hardhat test test/recompilation/recompilation-main-test.ts
echo "Success"

echo "Testing Recompilation with dependency changed"
echo "#" >> contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-dependency-test.ts
echo "Success"

echo "Testing Recompilation one file added another deleted"
rm -f contracts/hello.cairo
# Hello contract with original content
cat hello.cairo >> contracts/hello.cairo
rm -f contracts/dependency.cairo
npx hardhat test test/recompilation/recompilation-main-test.ts
echo "Success"
