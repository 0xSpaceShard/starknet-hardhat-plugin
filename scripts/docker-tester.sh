docker pull shramee/starknet-hardhat-dind-tester:0.1
docker run --rm -ti \
-e STARKNET_DEVNET=$(node -e "console.log(require('./config.json').STARKNET_DEVNET)") \
-e CAIRO_LANG=$(node -e "console.log(require('./config.json').CAIRO_LANG)") \
-p 8545:8545 \
-e STARKNET_HARDHAT_RUNNING_DIND="1" \
-e STARKNET_HARDHAT_DIND_HOST_PATH="/home/circleci/project:$(pwd)" \
-e HOME=$HOME \
-v "$HOME/.starknet_accounts_wallet_test":"$HOME/.starknet_accounts_wallet_test" \
-v $(pwd):/home/circleci/project \
-v /var/run/docker.sock:/var/run/docker.sock \
--entrypoint bash shramee/starknet-hardhat-dind-tester:0.1
