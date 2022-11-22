import { hardhatStarknetDeploy } from "../../utils/cli-functions";
import { ensureEnvVar, rmrfSync } from "../../utils/utils";

const network = ensureEnvVar("NETWORK");

// Hardhat starknet-deploy command
console.log("Testing Recompilation with deleted artifact on starknet-deploy");
rmrfSync("starknet-artifacts/contracts/contract.cairo");
hardhatStarknetDeploy(`--starknet-network ${network} starknet-artifacts/contracts/contract.cairo/ --inputs 10`.split(" "));
