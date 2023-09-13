import fs from "fs";
import path from "path";
import { hardhatStarknetCompile } from "../../utils/cli-functions";
import {
    assertCompilationArtifactsExist,
    assertEqual,
    assertGreater,
    ensureEnvVar,
    rmrfSync
} from "../../utils/utils";
import { HIDDEN_PLUGIN_DIR } from "../../../src/constants";
import { CAIRO_COMPILER as compilerVersion } from "../../../config.json";

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

// make sure the version is readable in hardhat.config.ts
process.env.CAIRO_COMPILER = compilerVersion;

const EXPECTED_COMPILER_BIN = path.join(
    ensureEnvVar("HOME"),
    HIDDEN_PLUGIN_DIR,
    "cairo-compiler",
    compilerVersion,
    "cairo",
    "bin"
);
const EXPECTED_COMPILER_PATH = path.join(EXPECTED_COMPILER_BIN, "starknet-compile");
const EXPECTED_SIERRA_COMPILER_PATH = path.join(EXPECTED_COMPILER_BIN, "starknet-sierra-compile");

/* Testing procedure */

// clear before any tests, just in case
rmrfSync(EXPECTED_COMPILER_BIN);

// initiate compilation; implicitly download compiler
compile();
// assert compiler downloaded and artifacts present
const compilerStatInitial = fs.statSync(EXPECTED_COMPILER_PATH);
assertArtifacts();

invalidate(EXPECTED_COMPILER_PATH);
compile(); // compile again; implicitly download compiler
// assert compiler redownloaded and artifacts present
const compilerStatRedownloaded = fs.statSync(EXPECTED_COMPILER_PATH);
assertGreater(compilerStatRedownloaded.ctime, compilerStatInitial.ctime);
assertArtifacts();

invalidate(EXPECTED_SIERRA_COMPILER_PATH);
compile(); // compile again; implicitly download compiler
// assert compiler redownloaded and artifacts present
const compilerStatRedownloaded2 = fs.statSync(EXPECTED_COMPILER_PATH);
assertGreater(compilerStatRedownloaded2.ctime, compilerStatRedownloaded.ctime);
assertArtifacts();

compile(); // compile again; compiler should be intact and artifacts present
// we make no assertions about the age of the artifacts as that is related to
// the recompilation functionality (not the responsibility of this test)
const compilerStatFinal = fs.statSync(EXPECTED_COMPILER_PATH);
assertEqual(compilerStatFinal.ctime.getTime(), compilerStatRedownloaded2.ctime.getTime());
assertArtifacts();
