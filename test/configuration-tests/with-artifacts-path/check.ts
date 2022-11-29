import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar, rmrfSync } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile("contracts/contract.cairo".split(" "));
hardhatStarknetDeploy(
    `--starknet-network ${network} my-starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(
        " "
    )
);
rmrfSync("my-starknet-artifacts");
