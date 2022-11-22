import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile(["contracts/util.cairo"]);
hardhatStarknetDeploy(`starknet-artifacts/contracts/util.cairo/ --starknet-network ${network} --wait`.split(" "));
