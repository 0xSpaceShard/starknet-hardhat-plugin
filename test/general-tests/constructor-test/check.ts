import { hardhatStarknetCompileDeprecated, hardhatStarknetTest } from "../../utils/cli-functions";

hardhatStarknetCompileDeprecated(
    "contracts/contract.cairo contracts/simple_storage.cairo contracts/empty_constructor.cairo".split(
        " "
    )
);
hardhatStarknetTest("--no-compile test/constructor.test.ts".split(" "));
