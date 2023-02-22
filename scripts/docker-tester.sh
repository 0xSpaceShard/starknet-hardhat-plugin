# docker build . -t shard-labs/starknet-hardhat-tester:0.1.0
docker run --rm -ti \
-e STARKNET_DEVNET=$(node -e "console.log(require('./config.json').STARKNET_DEVNET)") \
-e CAIRO_LANG=$(node -e "console.log(require('./config.json').CAIRO_LANG)") \
--network host \
-e STARKNET_HARDHAT_DIND_HOST_PATH="/home/circleci/project:$(pwd)" \
-v $(pwd):/home/circleci/project \
-v /var/run/docker.sock:/var/run/docker.sock \
--entrypoint bash shard-labs/starknet-hardhat-tester:0.1.0
