import { readFileSync } from "fs";
import path from "path";
import {
    hardhatStarknetCompile,
    hardhatStarknetDeploy,
    hardhatStarknetCall
} from "../../utils/cli-functions";
import { assertContains, ensureEnvVar, extractAddress } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile(["contracts/contract.cairo"]);
const output = hardhatStarknetDeploy(
    `--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
        " "
    ),
    true
);
console.log(output.stdout);

const address = extractAddress(output.stdout, "Contract address: ");
const prefix = path.join(__dirname);

console.log("Testing no input argument");
let execution = hardhatStarknetCall(
    `--starknet-network ${network} --contract contract --function sum_points_to_tuple --address ${address}`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "no-inputs.txt")).toString());
console.log("Success");

console.log("Testing too few input arguments");
execution = hardhatStarknetCall(
    `--starknet-network ${network} --contract contract --function sum_points_to_tuple --address ${address} --inputs "10 20 30"`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "too-few-inputs.txt")).toString());
console.log("Success");

console.log("Testing too many input arguments");
execution = hardhatStarknetCall(
    `--starknet-network ${network} --contract contract --function sum_points_to_tuple --address ${address} --inputs "10 20 30 40 50"`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "too-many-inputs.txt")).toString());
console.log("Success");

console.log("The success case of starknet-call test is temporarily disabled.");
console.log("To enable it back, uncomment the lines in its check.sh.");
// console.log("Testing success case");
// execution = hardhatStarknetCall(`--starknet-network ${network} --contract contract --function sum_points_to_tuple --address ${address} --inputs "10 20 30 40"`.split(" "), true);
// assertContains(execution.stdout, "40 60");
// console.log("Success");
