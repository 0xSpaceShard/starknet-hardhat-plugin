#!/bin/bash
set -e

cd ..
mocha --require ts-node/register test/general-tests/short-string-test/short-string-test.ts
