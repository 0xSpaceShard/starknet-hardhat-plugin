import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile --starknet-network devnet test/get-balance.test.ts".split(" "));
