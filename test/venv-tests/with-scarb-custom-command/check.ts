import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbAssertions } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";

// A duplicate of configuration-tests/with-scarb-path
// Useful because:
//   - it tests if the generated artifacts can be used in venv mode
//   - it is run in macos tests

const projectName = "cairo1_sample_project";
const buildResult = hardhatStarknetBuild([projectName]);
assertContains(buildResult.stdout, "Starknet plugin using custom Scarb");

scarbAssertions(projectName);
