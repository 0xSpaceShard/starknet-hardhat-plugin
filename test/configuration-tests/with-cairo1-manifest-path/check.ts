import { hardhatStarknetCairo1Compile } from "../../utils/cli-functions";
import { assertContains, assertExistence, ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_MANIFEST");
hardhatStarknetCairo1Compile("cairo1-contracts/cairo1.cairo ".split(" "));
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.json");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1.casm");
assertExistence("starknet-artifacts/cairo1-contracts/cairo1.cairo/cairo1_abi.json");

// Assert cairo0 compilation failure
const execution = hardhatStarknetCairo1Compile("contracts/contract.cairo".split(" "), true);
assertContains(execution.stdout, "Error: Contract not found");
