import { hardhatStarknetTest } from "../../utils/cli-functions";

// Test how --starknet-network can be specified through CLI while at the same time
// overriding hardhat.config specification.
// It would be sufficient to run this test just once and not for both alpha and devnet.
// Only tests if --starknet-network is accepted, not if the correct network is targeted.

hardhatStarknetTest("--no-compile --starknet-network devnet test/quick-test.ts".split(" "));
