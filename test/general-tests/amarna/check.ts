import { hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetTest("--no-compile test/amarna.test.ts".split(" "));
