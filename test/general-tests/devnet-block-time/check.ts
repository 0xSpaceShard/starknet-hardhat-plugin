import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile test/devnet-time-test.ts".split(" "));
