import { exit } from "process";
import { hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

console.log(
    "This test is suspended and can be removed in the future when we change how compiler version is selected"
);
console.log(
    "Read more here:",
    "https://github.com/0xSpaceShard/starknet-hardhat-plugin/issues/384"
);

exit(0);
const execution = hardhatStarknetTest(["--no-compile", "test/quick-test.ts"], true);
assertContains(execution.stderr, "cairo1BinDir cannot be used with dockerized plugin");
