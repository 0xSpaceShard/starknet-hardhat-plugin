import { readFileSync } from "fs";
import path from "path";
import {
    hardhatStarknetCompile,
    hardhatStarknetDeploy,
    hardhatStarknetInvoke
} from "../../utils/cli-functions";
import { assertContains, ensureEnvVar, extractAddress } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile(["contracts/contract.cairo"]);
const output = hardhatStarknetDeploy(
    `--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
        " "
    )
);

const address = extractAddress(output.stdout, "Contract address: ");
const prefix = path.join(__dirname);

console.log("Testing no input argument");
let execution = hardhatStarknetInvoke(
    `--starknet-network ${network} --contract contract --function increase_balance --address ${address}`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "no-inputs.txt")).toString());
console.log("Success");

console.log("Testing too few input arguments");
execution = hardhatStarknetInvoke(
    `--starknet-network ${network} --contract contract --function increase_balance --address ${address} --inputs 10`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "too-few-inputs.txt")).toString());
console.log("Success");

console.log("Testing too many input arguments");
execution = hardhatStarknetInvoke(
    `--starknet-network ${network} --contract contract --function increase_balance --address ${address} --inputs "10 20 30"`.split(
        " "
    ),
    true
);
assertContains(execution.stderr, readFileSync(path.join(prefix, "too-many-inputs.txt")).toString());
console.log("Success");

console.log("The success case of starknet-invoke test is temporarily disabled.");
console.log("To enable it back, uncomment the lines in its check.sh.");
// console.log("Testing success case");
// execution = hardhatStarknetInvoke(`--starknet-network ${network} --contract contract --function increase_balance --address ${address} --inputs "10 20"`.split(" "), true);
// assertContains(execution.stdout, "Invoke transaction was sent.");
// console.log("Success");
