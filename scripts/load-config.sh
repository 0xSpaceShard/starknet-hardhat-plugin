#!/bin/bash

# Iterates through config.json keys and set environment variables based on the key name

for key in $(jq -r 'keys[]' config.json); do
    export "$key"="$(jq -r .[\""$key"\"] config.json)"
done
