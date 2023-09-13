import fs from "fs";
import path from "path";
import { hardhatStarknetCompile } from "../../utils/cli-functions";
import {
    assertCompilationArtifactsExist,
    assertContains,
    assertEqual,
    assertGreater,
    ensureEnvVar,
    rmrfSync
} from "../../utils/utils";
import { HIDDEN_PLUGIN_COMPILER_SUBDIR, HIDDEN_PLUGIN_DIR } from "../../../src/constants";
import { CAIRO_COMPILER as validCompilerVersion } from "../../../config.json";

/* Helper functions and constants */

function compile() {
    hardhatStarknetCompile(["cairo1-contracts/contract1.cairo", "--single-file"]);
}

function assertArtifacts() {
    assertCompilationArtifactsExist(
        "starknet-artifacts/cairo1-contracts/contract1.cairo",
        "contract1"
    );
}

function invalidate(invalidablePath: string) {
    fs.writeFileSync(invalidablePath, "garbage");
}

const EXPECTED_COMPILER_BIN = path.join(
    ensureEnvVar("HOME"),
    HIDDEN_PLUGIN_DIR,
    HIDDEN_PLUGIN_COMPILER_SUBDIR,
    validCompilerVersion,
    "cairo",
    "bin"
);
const EXPECTED_COMPILER_PATH = path.join(EXPECTED_COMPILER_BIN, "starknet-compile");
const EXPECTED_SIERRA_COMPILER_PATH = path.join(EXPECTED_COMPILER_BIN, "starknet-sierra-compile");

/* Testing procedure */

// clear before any tests, just in case
rmrfSync(EXPECTED_COMPILER_BIN);

// Test case - invalid compiler version
const nonExistentVersion = "1.123.1"; // doesn't exist and shouldn't ever exist
process.env.CAIRO_COMPILER = nonExistentVersion;
const invalidExecution = hardhatStarknetCompile(
    ["cairo1-contracts/contract1.cairo", "--single-file"],
    true // expectFailure
);
assertContains(
    invalidExecution.stderr,
    `Could not download cairo ${nonExistentVersion}. Make sure that it exists.`
);

// Test case - implicitly download compiler and compile
process.env.CAIRO_COMPILER = validCompilerVersion;
compile();
// assert compiler downloaded and artifacts present
const compilerStatInitial = fs.statSync(EXPECTED_COMPILER_PATH);
assertArtifacts();

// Test case - invalidate compiler to cause redownload
invalidate(EXPECTED_COMPILER_PATH);
compile();
// assert compiler redownloaded and artifacts present
const compilerStatRedownloaded = fs.statSync(EXPECTED_COMPILER_PATH);
assertGreater(compilerStatRedownloaded.ctime, compilerStatInitial.ctime);
assertArtifacts();

// Test case - invalidate sierra compiler to cause redownload
invalidate(EXPECTED_SIERRA_COMPILER_PATH);
compile();
// assert compiler redownloaded and artifacts present
const compilerStatRedownloaded2 = fs.statSync(EXPECTED_COMPILER_PATH);
assertGreater(compilerStatRedownloaded2.ctime, compilerStatRedownloaded.ctime);
assertArtifacts();

// Test case - compile again - no compiler change expected
compile();
// we make no assertions about the age of contract artifacts as that is related to
// the recompilation functionality (not the responsibility of this test)
const compilerStatFinal = fs.statSync(EXPECTED_COMPILER_PATH);
assertEqual(compilerStatFinal.ctime.getTime(), compilerStatRedownloaded2.ctime.getTime());
assertArtifacts();
