docker build . -t shard-labs/starknet-hardhat-tester:0.1.0
docker run --rm -ti \
-v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/home/circleci/project \
--entrypoint bash shard-labs/starknet-hardhat-tester:0.1.0
