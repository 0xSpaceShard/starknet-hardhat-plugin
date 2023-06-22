import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbArtifactsAssertion } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";
import * as fs from "fs";
import * as path from "path";

const projectName = "cairo1_sample_project";

// override the config file with an invalid one - doesn't specify casm generation
const invalidConfigFilePath = path.join(__dirname, "Scarb-invalid.toml");
fs.copyFileSync(invalidConfigFilePath, path.join(projectName, "Scarb.toml"));

// expect failure
console.log("Expecting rejection if invalid config file");
const buildResult = hardhatStarknetBuild([projectName], true);
assertContains(buildResult.stderr, "Invalid config file");

// expect to pass if skipping validation
console.log("Expecting success if skipping validation");
hardhatStarknetBuild([projectName, "--skip-validate"], false);
scarbArtifactsAssertion(projectName, undefined, undefined, [".json", "_abi.json"]);
