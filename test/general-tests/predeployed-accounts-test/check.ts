import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile test/get-predeployed-accounts.test.ts".split(" "));
