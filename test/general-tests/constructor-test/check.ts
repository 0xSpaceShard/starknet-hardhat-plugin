import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompile(
    "contracts/contract.cairo contracts/simple_storage.cairo contracts/empty_constructor.cairo".split(
        " "
    )
);
hardhatStarknetTest("--no-compile test/constructor.test.ts".split(" "));
