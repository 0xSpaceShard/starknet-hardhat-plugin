import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile test/devnet-create-block.test.ts".split(" "));
