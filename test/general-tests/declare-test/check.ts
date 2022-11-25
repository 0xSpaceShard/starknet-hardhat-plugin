import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile("contracts/contract.cairo contracts/deployer.cairo".split(" "));
hardhatStarknetTest("--no-compile test/declare-deploy.test.ts".split(" "));
