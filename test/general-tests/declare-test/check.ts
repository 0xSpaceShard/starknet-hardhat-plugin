import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated("contracts/contract.cairo contracts/deployer.cairo".split(" "));
hardhatStarknetTest("--no-compile test/declare-deploy.test.ts".split(" "));
