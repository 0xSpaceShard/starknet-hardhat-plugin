import { contains } from "../../utils/utils";
import path from "path";
import { readFileSync } from "fs";
import { hardhatStarknetCompile, hardhatStarknetDeploy, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(["contracts/contract.cairo"]);
const artifactsPath = "starknet-artifacts/contracts/contract.cairo/";
const invalidNetwork = "foo";
const expected = "Error in plugin Starknet: Invalid network provided in starknet.network in hardhat.config: foo.";
const prefix = path.join(__dirname);

console.log("Testing no starknet network");
let execution = hardhatStarknetDeploy(`${artifactsPath} --inputs 10`.split(" "), true);
contains(execution.stderr, readFileSync(path.join(prefix, "without-starknet-network.txt")).toString());
console.log("Success");

console.log("Testing invalid CLI network");
execution = hardhatStarknetDeploy(`--starknet-network ${invalidNetwork} ${artifactsPath} --inputs 10`.split(" "), true);
contains(execution.stderr, readFileSync(path.join(prefix, "invalid-cli-network.txt")).toString());
console.log("Success");

console.log("Testing no mocha network");
process.env.NETWORK = "";
hardhatStarknetTest("--no-compile test/contract-factory-test.ts".split(" "));
console.log("Success");

console.log("Testing invalid config network");
process.env.NETWORK = invalidNetwork;
execution = hardhatStarknetTest("--no-compile test/contract-factory-test.ts".split(" "), true);
contains(execution.stderr, expected);
console.log("Success");
