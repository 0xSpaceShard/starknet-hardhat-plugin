import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { exec } from "../../utils/utils";

hardhatStarknetCompile("contracts/contract.cairo contracts/util.cairo".split(" "));

exec("cp -a starknet-artifacts/contracts test/test-artifacts");

hardhatStarknetTest("--no-compile test/relative-artifacts.test.ts".split(" "));
