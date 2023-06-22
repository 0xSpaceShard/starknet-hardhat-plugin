import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { assertContains } from "../../utils/utils";

const projectName = "cairo1_sample_project";
const buildResult = hardhatStarknetBuild([projectName], true);
console.log("Temporarily expecting that dockerized scarb cannot be used");
assertContains(buildResult.stderr, "Dockerized Scarb is not yet supported");
