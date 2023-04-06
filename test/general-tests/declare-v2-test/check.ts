import { hardhatStarknetCairo1Compile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCairo1Compile("cairo1-contracts/cairo1.cairo".split(" "));
hardhatStarknetTest("--no-compile test/declare-v2.test.ts".split(" "));
