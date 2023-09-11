import { hardhatStarknetCompile } from "../../utils/cli-functions";
import { assertExistence } from "../../utils/utils";

hardhatStarknetCompile(["cairo1-contracts/contract1.cairo", "--single-file"]);
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1.json");
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1.casm");
assertExistence("starknet-artifacts/cairo1-contracts/contract1.cairo/contract1_abi.json");
