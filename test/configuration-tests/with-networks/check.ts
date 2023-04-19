import { assertContains } from "../../utils/utils";
import path from "path";
import { readFileSync } from "fs";
import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated(["contracts/contract.cairo"]);

const invalidNetwork = "foo";
const expected = `Error in plugin Starknet: Invalid network provided in starknet.network in hardhat.config: ${invalidNetwork}.`;
const prefix = __dirname;

console.log("Testing invalid CLI network");
let execution = hardhatStarknetTest(
    [
        "test/contract-factory-creation.test.ts",
        "--no-compile",
        "--starknet-network",
        invalidNetwork
    ],
    true
);
assertContains(
    execution.stderr,
    readFileSync(path.join(prefix, "invalid-cli-network.txt")).toString()
);
console.log("Success");

console.log("Testing no mocha network");
process.env.NETWORK = "";
hardhatStarknetTest(["--no-compile", "test/contract-factory-creation.test.ts"]);
console.log("Success");

console.log("Testing invalid config network");
process.env.NETWORK = invalidNetwork;
execution = hardhatStarknetTest(["--no-compile", "test/contract-factory-creation.test.ts"], true);
assertContains(execution.stderr, expected);
console.log("Success");

console.log("Testing deployment with alpha-goerli2 config network is temporarily disabled.");
// console.log("Testing with alpha-goerli2 config network");
// process.env.NETWORK = "alpha-goerli2";
// execution = hardhatStarknetTest(
//    ["test/contract-factory-creation.test.ts", "--no-compile", "--starknet-network", "alpha-goerli2"]
// );
