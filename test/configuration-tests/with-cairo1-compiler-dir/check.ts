import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains, assertExistence, ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_DIR");
hardhatStarknetCompile(["cairo1-contracts/cairo1.cairo"]);
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.sierra.json");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.casm.json");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1_abi.json");

// Assert cairo0 compilation failure
const execution = hardhatStarknetCompile("contracts/contract.cairo".split(" "), true);
assertContains(execution.stdout, "Error: Contract not found");
