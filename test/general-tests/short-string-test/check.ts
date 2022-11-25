import { hardhatStarknetTest } from "../../utils/cli-functions";

process.chdir("..");

// The config file used for running mocha tests is the one in root

hardhatStarknetTest(
    "--no-compile test/general-tests/short-string-test/short-string-test.ts".split(" ")
);
