#!/bin/bash
set -e

npx hardhat starknet-compile contracts/contract.cairo
output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
echo $output

ADDRESS=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")
PREFIX=$(dirname "$0")

echo "Testing no input argument"
npx hardhat starknet-estimate-fee --starknet-network "$NETWORK" --contract contract --function sum_points_to_tuple --address "$ADDRESS" 2>&1 \
    | tail -n +6 \
    | diff - "$PREFIX/no-inputs.txt"
echo "Success"

echo "Testing too few input arguments"
npx hardhat starknet-estimate-fee --starknet-network "$NETWORK" --contract contract --function sum_points_to_tuple --address "$ADDRESS" --inputs "10 20 30" 2>&1 \
    | tail -n +6 \
    | diff - "$PREFIX/too-few-inputs.txt"
echo "Success"

echo "Testing too many input arguments"
npx hardhat starknet-estimate-fee --starknet-network "$NETWORK" --contract contract --function sum_points_to_tuple --address "$ADDRESS" --inputs "10 20 30 40 50" 2>&1 \
    | tail -n +6 \
    | diff - "$PREFIX/too-many-inputs.txt"
echo "Success"

echo "The success case of starknet-estimate-fee test is temporarily disabled."
echo "To enable it back, uncomment the lines in its check.sh."
# echo "Testing success case"
# npx hardhat starknet-estimate-fee --starknet-network "$NETWORK" --contract contract --function sum_points_to_tuple --address "$ADDRESS" --inputs "10 20 30 40" 2>&1 \
#     | tail -n +2 \
#     | head -n -3 \
#     | diff - <(echo "40 60")
# echo "Success"
