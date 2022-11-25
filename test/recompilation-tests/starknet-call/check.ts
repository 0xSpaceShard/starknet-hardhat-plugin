import { hardhatStarknetDeploy, hardhatStarknetCall } from "../../utils/cli-functions";
import { extractAddress, ensureEnvVar, rmrfSync } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

console.log("Testing Recompilation with deleted artifact on starknet-call");
const output = hardhatStarknetDeploy(
    `--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
        " "
    )
);
const address = extractAddress(output.stdout, "Contract address: ");

rmrfSync("starknet-artifacts/contracts/contract.cairo");
hardhatStarknetCall(
    `--starknet-network ${network} --contract contract --function sum_points_to_tuple --address ${address} --inputs "10 20 30 40"`.split(
        " "
    )
);
