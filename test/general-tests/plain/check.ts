import {
    hardhatStarknetCompile,
    hardhatStarknetDeploy,
    hardhatStarknetTest
} from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");
const initialValue = 10;
const publicKey = "1628448741648245036800002906075225705100596136133912895015035902954123957052";

hardhatStarknetCompile([]);
hardhatStarknetDeploy(
    `starknet-artifacts/contracts/contract.cairo/ --starknet-network ${network} --inputs ${initialValue}`.split(
        " "
    )
);
hardhatStarknetDeploy(
    `starknet-artifacts/contracts/auth_contract.cairo/ --inputs "${publicKey} ${initialValue}" --starknet-network ${network}`.split(
        " "
    )
);
hardhatStarknetTest("--no-compile test/sample-test.ts".split(" "));
