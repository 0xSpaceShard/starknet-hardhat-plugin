import { hardhatStarknetRun } from "../../utils/cli-functions";
import { assertContains, rmrfSync } from "../../utils/utils";

const expected = "StarknetPluginError: Could not find JSON artifact for";

console.log("Testing with deleted artifact on recompiler option set to default (off)");
rmrfSync("starknet-artifacts/contracts/contract.cairo");
const execution = hardhatStarknetRun("--no-compile scripts/deploy.ts".split(" "), true);
assertContains(execution.stderr, expected);
console.log("Success");
