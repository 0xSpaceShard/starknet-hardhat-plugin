#!/bin/bash

# TEST_SUBDIR="general-tests"
# test_name="account-test"

cd test

TEST_SUBDIR_PENDING="true"
TEST_NAME_PENDING="true"

while [[ -n $TEST_SUBDIR_PENDING ]]; do

	echo "(Tab to autocomplete)"
	read -e -p "Test suite:" TEST_SUBDIR
	TEST_SUBDIR="${TEST_SUBDIR%/}"

	if [[ -d $TEST_SUBDIR ]]; then
		if [[ $TEST_SUBDIR != "${TEST_SUBDIR%-tests}" ]]; then
			TEST_SUBDIR_PENDING=""
		fi
	else
		echo ""
		echo "Please pick from,"
		ls | grep '\-tests' | awk '{print " - "$1}'
		echo ""
	fi
done

TEST_SUBDIR="${TEST_SUBDIR%/}" # remove trailing slash

cd $TEST_SUBDIR

echo ""
while [[ -n $TEST_NAME_PENDING ]]; do
	echo "(Tab to autocomplete)"
	read -e -p "Test:" test_name
	test_name="${test_name%/}"

	if [[ -d $test_name ]]; then
		echo "Running test $test_name from $TEST_SUBDIR"
		TEST_NAME_PENDING=""
	else
		echo "Please pick from,"
		ls | awk '{print " - "$1}'
		echo ""
	fi
done

cd ../..

test_name="${test_name%/}" # remove trailing slash
RUN_SETUP="y"

if [[ -d starknet-hardhat-example/ ]]; then
	read -e -p "Example repo found, y to force run setup." RUN_SETUP
fi

if [[ -n $RUN_SETUP ]]; then
	source  ./scripts/setup-cairo1-compiler.sh
	rm -rf starknet-hardhat-example
	git clone -b "${EXAMPLE_REPO_BRANCH:=plugin}" --single-branch https://github.com/0xSpaceShard/starknet-hardhat-example.git
	cd starknet-hardhat-example
	npm ci
	npm install ../ # install plugin from source (parent dir)
	cd ..
else
	echo "Skipped setup."
fi

while [[ "true" ]]; do
	TEST_SUBDIR=$TEST_SUBDIR STARKNET_HARDHAT_DEV=1 ./scripts/test.sh $test_name
	echo "---------------------------------"
	echo ""
	read -e -p "Press Ctrl + C to terminate. Re-run test?" UNUSED_VARIABLE
done
