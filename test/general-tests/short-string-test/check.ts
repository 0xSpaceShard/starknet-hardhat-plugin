import { exec } from "../../utils/utils";

process.chdir("..");

// The config file used for running mocha tests is the one in root

exec("npx hardhat test --no-compile test/general-tests/short-string-test/short-string-test.ts");
