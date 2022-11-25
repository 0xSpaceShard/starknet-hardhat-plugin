import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile("contracts/contract.cairo".split(" "));
hardhatStarknetDeploy(
    `starknet-artifacts/contracts/contract.cairo/ --inputs "10" --starknet-network ${network}`.split(
        " "
    )
);
hardhatStarknetDeploy(
    `starknet-artifacts/contracts/contract.cairo/ --inputs "10" --starknet-network ${network} --salt 0x10`.split(
        " "
    )
);
