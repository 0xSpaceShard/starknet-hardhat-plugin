import path from "path";
import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar, exec } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

// exec(`bash ${path.join(__dirname, "venv.sh")}`);
const initialValue = 10;

hardhatStarknetCompile([]);
hardhatStarknetDeploy(`starknet-artifacts/contracts/contract.cairo/ --starknet-network ${network} --inputs ${initialValue}`.split(" "));
