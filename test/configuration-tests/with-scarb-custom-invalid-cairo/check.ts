import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";
import * as fs from "fs";
import * as path from "path";

const projectName = "cairo1_sample_project";

// override a cairo source file with an invalid one
const invalidConfigFilePath = path.join(__dirname, "multiple_contracts_invalid.cairo");
fs.copyFileSync(invalidConfigFilePath, path.join(projectName, "src", "multiple_contracts.cairo"));

// expect failure
console.log("Expecting rejection if invalid cairo source file");
const buildResult = hardhatStarknetBuild([projectName], true);
assertContains(buildResult.stderr, "Failed building of 1 project");
