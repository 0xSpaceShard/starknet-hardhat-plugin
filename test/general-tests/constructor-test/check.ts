import path from "path";
import {
    hardhatStarknetCompile,
    hardhatStarknetCompileDeprecated,
    hardhatStarknetTest
} from "../../utils/cli-functions";
import { copyFileSync } from "fs";

const prefix = path.join(__dirname);
const contract1 = "duplicate_constructor.cairo";
const contract1Path = path.join("cairo1-contracts", contract1);

const contract2 = "no_constructor.cairo";
const contract2Path = path.join("cairo1-contracts", contract2);

const contract3 = "mute_constructor.cairo";
const contract3Path = path.join("cairo1-contracts", contract3);

copyFileSync(path.join(prefix, contract1), contract1Path);
copyFileSync(path.join(prefix, contract2), contract2Path);
copyFileSync(path.join(prefix, contract3), contract3Path);

// Compile cairo1 contracts
hardhatStarknetCompile(["cairo1-contracts/", "--add-pythonic-hints"]);

hardhatStarknetCompileDeprecated(
    "contracts/contract.cairo contracts/simple_storage.cairo contracts/empty_constructor.cairo".split(
        " "
    )
);
hardhatStarknetTest("--no-compile test/constructor.test.ts".split(" "));
