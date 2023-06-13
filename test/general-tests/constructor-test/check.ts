import path from "path";
import { hardhatStarknetCompile, hardhatStarknetTest } from "../../utils/cli-functions";
import { copyFileSync } from "fs";
import { assertContains, rmrfSync } from "../../utils/utils";

const prefix = path.join(__dirname);
const sourcesPath = "cairo1-contracts";

const duplicateConstructorContract = "duplicate_constructor.cairo";
const noConstructorContract = "no_constructor.cairo";
const muteConstructorContract = "mute_constructor.cairo";
const commentedConstructorContract = "commented_constructor.cairo";
const emptyLineConstructorContract = "empty_line_constructor.cairo";

const contractNames = [
    duplicateConstructorContract,
    noConstructorContract,
    muteConstructorContract,
    commentedConstructorContract,
    emptyLineConstructorContract
];

// Copy contracts to example repo to ensure files exists
for (const contractName of contractNames) {
    const contractPath = path.join(sourcesPath, muteConstructorContract);
    copyFileSync(path.join(prefix, contractName), contractPath);
}

const contract1Path = path.join(sourcesPath, duplicateConstructorContract);
const expectedErrorMsg = "Error: Expected at most one constructor.";
const execution = hardhatStarknetCompile([contract1Path], true);
console.log(execution);
assertContains(execution.stderr, expectedErrorMsg);
rmrfSync(contract1Path);

// Compile cairo1 contracts
hardhatStarknetCompile([sourcesPath, "--add-pythonic-hints"]);
hardhatStarknetTest("--no-compile test/constructor.test.ts".split(" "));
