import { renameSync } from "fs";
import { hardhatStarknetCompile, hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

renameSync("contracts", "my-starknet-sources");

hardhatStarknetCompile([]);
hardhatStarknetDeploy(`starknet-artifacts/my-starknet-sources/contract.cairo/ --starknet-network ${network} --inputs 10`.split(" "));
