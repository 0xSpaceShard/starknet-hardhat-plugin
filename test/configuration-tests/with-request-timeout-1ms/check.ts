import { hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const execution = hardhatStarknetTest("--no-compile test/get-balance.test.ts".split(" "), true);
assertContains(execution.stdout, "AxiosError: timeout of 1ms exceeded");
