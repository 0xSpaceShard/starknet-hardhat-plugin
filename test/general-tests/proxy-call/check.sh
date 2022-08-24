#!/bin/bash
set -e

npx hardhat test --no-compile scripts/delegate-proxy.ts
