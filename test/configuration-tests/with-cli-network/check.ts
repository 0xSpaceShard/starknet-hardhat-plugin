import { hardhatStarknetRun, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

// Test how --starknet-network can be specified through CLI while at the same time
// overriding hardhat.config specification.
// It would be sufficient to run this test just once and not for both alpha and devnet.
// Only tests if --starknet-network is accepted, not if the correct network is targeted.

// currently not supported for hardhat run
const runWithCliNetwork = hardhatStarknetRun(
    "--no-compile --starknet-network devnet scripts/compile-contract.ts".split(" "),
    true
);
assertContains(
    runWithCliNetwork.stderr,
    "\"--starknet-network\" with \"hardhat run\" currently does not have effect"
);

// compile to have artifacts for hardhat test
hardhatStarknetRun("--no-compile scripts/compile-contract.ts".split(" "));

hardhatStarknetTest("--no-compile --starknet-network devnet test/quick-test.ts".split(" "));
