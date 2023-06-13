import path from "path";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { copyFileSync } from "fs";
import { assertContains, rmrfSync } from "../../utils/utils";

const prefix = path.join(__dirname);
const sourcesPath = "cairo1-contracts";

const duplicateConstructorContract = "duplicate_constructor.cairo";
const contract1Path = path.join(sourcesPath, duplicateConstructorContract);

const noConstructorContract = "no_constructor.cairo";
const contract2Path = path.join(sourcesPath, noConstructorContract);

const muteConstructorContract = "mute_constructor.cairo";
const contract3Path = path.join(sourcesPath, muteConstructorContract);

const commentedConstructorContract = "commented_constructor.cairo";
const contract4Path = path.join(sourcesPath, commentedConstructorContract);

const emptyLineConstructorContract = "empty_line_constructor.cairo";
const contract5Path = path.join(sourcesPath, emptyLineConstructorContract);

// Copy contracts to example repo to ensure files exists
copyFileSync(path.join(prefix, duplicateConstructorContract), contract1Path);
copyFileSync(path.join(prefix, noConstructorContract), contract2Path);
copyFileSync(path.join(prefix, muteConstructorContract), contract3Path);
copyFileSync(path.join(prefix, commentedConstructorContract), contract4Path);
copyFileSync(path.join(prefix, emptyLineConstructorContract), contract5Path);

const expectedErrorMsg = "Error: Expected at most one constructor.";
const execution = hardhatStarknetCompile([contract1Path], true);
assertContains(execution.stderr, expectedErrorMsg);
rmrfSync(contract1Path);

// Compile cairo1 contracts
hardhatStarknetCompile(["cairo1-contracts/", "--add-pythonic-hints"]);
hardhatStarknetTest("--no-compile test/constructor.test.ts".split(" "));
