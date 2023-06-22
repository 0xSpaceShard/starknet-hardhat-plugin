import { hardhatStarknetBuild } from "../../utils/cli-functions";
import { scarbAssertions } from "../../utils/scarb-utils";
import { assertContains } from "../../utils/utils";

const projectName = "cairo1_sample_project";
// override the default
const customCommand = `${process.env.HOME}/.local/bin/scarb`;
const buildResult = hardhatStarknetBuild([projectName, "--scarb-command", customCommand]);
assertContains(buildResult.stdout, "Starknet plugin using custom Scarb");

scarbAssertions(projectName);
