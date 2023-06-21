import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbAssertions } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";

const projectName = "cairo1_sample_project";
const buildResult = hardhatStarknetBuild([projectName]);
assertContains(buildResult.stdout, "Starknet plugin using custom Scarb");

scarbAssertions(projectName);
