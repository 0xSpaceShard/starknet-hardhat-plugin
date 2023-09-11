import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains, assertExistence, ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_DIR");
hardhatStarknetCompile([
    "cairo1-contracts/contract1.cairo",
    "--add-pythonic-hints",
    "--single-file"
]);
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1.json");
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1.casm");
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1_abi.json");

// Assert cairo0 compilation failure
const execution = hardhatStarknetCompile(
    ["contracts/contract.cairo", "--add-pythonic-hints", "--single-file"],
    true
);
assertContains(execution.stderr, "Failed compilation of 1 contract");
