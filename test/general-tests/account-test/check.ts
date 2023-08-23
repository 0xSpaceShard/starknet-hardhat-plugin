import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated("contracts/contract.cairo contracts/util.cairo".split(" "));
hardhatStarknetTest("--no-compile test/oz-account-test.ts".split(" "));
// _TODO: skipped because required setup is not supported, see ./hardhat.config.ts
// hardhatStarknetTest("--no-compile test/argent-account-test.ts".split(" "));
