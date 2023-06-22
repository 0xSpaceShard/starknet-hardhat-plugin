import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbArtifactsAssertion } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";
import * as fs from "fs";

// generate another project - a copy of the sample one
const projectName = "cairo1_sample_project";
const copiedProjectName = "cairo1_copied_project";

fs.cpSync(projectName, copiedProjectName, { recursive: true });

const buildResult = hardhatStarknetBuild([projectName, copiedProjectName]);
assertContains(buildResult.stdout, "Starknet plugin using custom Scarb");

scarbArtifactsAssertion(projectName);
scarbArtifactsAssertion(copiedProjectName);
