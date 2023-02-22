import { hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const execution = hardhatStarknetTest(
    "--no-compile --starknet-network devnet test/get-balance.test.ts".split(" "),
    true
);
assertContains(execution.stdout, "Error: timeout of 1ms exceeded");
