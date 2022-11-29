#!/bin/bash

# Logs used versions

set -eu

echo "node: $(node --version)"
echo "npm: $(npm --version)"

#these two commands may return different versions (e.g. if using circleci/node and remote docker)
echo "docker: $(docker --version)"
docker version

echo "python3: $(python3 --version)"
echo "pip3: $(pip3 --version)"
