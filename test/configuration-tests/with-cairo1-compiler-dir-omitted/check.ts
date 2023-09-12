import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertCompilationArtifactsExist } from "../../utils/utils";

hardhatStarknetCompile(["cairo1-contracts/contract1.cairo", "--single-file"]);
assertCompilationArtifactsExist("starknet-artifacts/cairo1-contracts/contract1.cairo", "contract1");
