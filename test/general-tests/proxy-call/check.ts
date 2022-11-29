import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile scripts/delegate-proxy.ts".split(" "));
