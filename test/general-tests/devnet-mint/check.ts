import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile test/devnet-mint.test.ts".split(" "));
