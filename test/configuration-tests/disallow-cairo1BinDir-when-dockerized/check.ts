import { hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const execution = hardhatStarknetTest(["--no-compile", "test/quick-test.ts"], true);
assertContains(execution.stderr, "cairo1BinDir cannot be used with dockerized plugin");
