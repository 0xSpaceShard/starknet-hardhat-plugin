#!/bin/bash

git clone git@github.com:OpenZeppelin/cairo-contracts.git
rm -rf contracts
mv cairo-contracts/contracts contracts
