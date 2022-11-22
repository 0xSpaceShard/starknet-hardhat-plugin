import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile("contracts/contract.cairo".split(" "));
hardhatStarknetDeploy(`starknet-artifacts/contracts/contract.cairo --starknet-network ${network} --inputs 10`.split(" "));
