#!/bin/bash
set -e

node --version
npm --version

#these two commands may return different versions (e.g. if using circleci/node and remote docker)
docker --version
docker version

python3 --version
pip3 --version
