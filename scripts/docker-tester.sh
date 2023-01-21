docker build . -t starknet-hardhat-plugin-tester
docker run --rm -ti \
-v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/home/circleci/project \
--entrypoint bash starknet-hardhat-plugin-tester
