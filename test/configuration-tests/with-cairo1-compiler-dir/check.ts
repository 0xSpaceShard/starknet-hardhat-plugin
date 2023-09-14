import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertContains, assertCompilationArtifactsExist, ensureEnvVar } from "../../utils/utils";

ensureEnvVar("CAIRO_1_COMPILER_DIR");
hardhatStarknetCompile(["cairo1-contracts/contract1.cairo", "--single-file"]);
assertCompilationArtifactsExist("starknet-artifacts/cairo1-contracts/contract1.cairo", "contract1");

// Assert cairo0 compilation failure
const execution = hardhatStarknetCompile(["contracts/contract.cairo", "--single-file"], true);
assertContains(execution.stderr, "error: Skipped tokens.");
