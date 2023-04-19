import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains, assertExistence, ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_MANIFEST");
hardhatStarknetCompile("cairo1-contracts/cairo1.cairo ".split(" "));
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.json");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.casm");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1_abi.json");

// Assert cairo0 compilation failure
const execution = hardhatStarknetCompile("contracts/contract.cairo".split(" "), true);
assertContains(execution.stdout, "Error: Contract not found");
