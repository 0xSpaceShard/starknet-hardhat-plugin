#!/bin/bash
set -eu

export ACCOUNT_DIR="$HOME/.starknet_accounts_wallet_test"

npx hardhat starknet-compile contracts/contract.cairo

../scripts/deploy-funded-cli-account.sh

npx hardhat test --no-compile test/wallet-test.ts

output=$(npx hardhat starknet-deploy --starknet-network "$NETWORK" starknet-artifacts/contracts/contract.cairo/ --inputs 10)
echo $output
ADDRESS=$(echo $output | sed -r "s/.*Contract address: (\w*).*/\1/")

npx hardhat starknet-call --contract contract --function get_balance --address "$ADDRESS" --wallet OpenZeppelin --starknet-network "$NETWORK"
npx hardhat starknet-invoke --contract contract --function increase_balance --inputs "10 20" --address "$ADDRESS" --wallet OpenZeppelin --starknet-network "$NETWORK"
