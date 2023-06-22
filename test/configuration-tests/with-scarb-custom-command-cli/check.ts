import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbAssertions } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";

const projectName = "cairo1_sample_project";
// override the default of using dockerized Scarb
const buildResult = hardhatStarknetBuild([projectName, "--scarb-command", "scarb"]);
assertContains(buildResult.stdout, "Starknet plugin using custom Scarb");

scarbAssertions(projectName);
