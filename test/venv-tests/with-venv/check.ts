import { hardhatStarknetCompile, hardhatStarknetDeploy, hardhatStarknetTest } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const initialValue = 10;
const network = ensureEnvVar("NETWORK");

hardhatStarknetCompile([]);
hardhatStarknetDeploy(`starknet-artifacts/contracts/contract.cairo/ --starknet-network ${network} --inputs ${initialValue}`.split(" "));
hardhatStarknetTest("--no-compile test/quick-test.ts".split(" "));
