import {
    hardhatStarknetCompile,
    hardhatStarknetRun,
    hardhatStarknetTest
} from "../../utils/cli-functions";

hardhatStarknetCompile([]);

// assert successful interaction with contracts on the file system
hardhatStarknetTest(["test/contract-factory-creation.test.ts", "--no-compile"]);

// assert successful interaction with the network
hardhatStarknetRun(["scripts/deploy.ts", "--no-compile"]);
