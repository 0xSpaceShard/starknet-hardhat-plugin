#!/bin/bash

if [[ -n "${STARKNET_HARDHAT_RUNNING_DIND:-}" ]]; then
	# Running in DinD testing environment
	# Stop docker devnet container
	docker rm -f starknet_hardhat_dind_devnet
else
	# Kill devnet process
	pkill -f starknet-devnet
fi