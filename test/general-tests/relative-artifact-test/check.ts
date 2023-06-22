import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";
import * as fs from "fs";

hardhatStarknetCompileDeprecated("contracts/contract.cairo contracts/util.cairo".split(" "));

fs.cpSync("starknet-artifacts/contracts", "test/test-artifacts", { recursive: true });

hardhatStarknetTest("--no-compile test/relative-artifacts.test.ts".split(" "));
