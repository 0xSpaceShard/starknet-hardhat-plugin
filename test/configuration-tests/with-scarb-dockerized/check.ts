import { hardhatStarknetBuild, hardhatStarknetTest } from "../../utils/cli-functions";
import { assertContains, assertExistence } from "../../utils/utils";
import * as path from "path";

/**
 * Testing if compilation with scarb produces the expected artifacts and if the contract can then be declared.
 */

const buildResult = hardhatStarknetBuild(["cairo1_sample_project"]);
assertContains(buildResult.stdout, "Plugin Starknet using dockerized compiler");

const projectPath = path.join("starknet-artifacts", "cairo1_sample_project");
const packageName = "sample_project_name";
const contractNames = ["AnotherContract", "ContractSimple", "Contract", "FirstContract"]; // TODO tentative list
for (const contractName of contractNames) {
    const compoundContractName = `${packageName}_${contractName}`;
    const contractDirPath = path.join(projectPath, `${compoundContractName}.cairo`);
    for (const extension of [".json", "_abi.json", ".casm"]) {
        const artifactPath = path.join(contractDirPath, `${compoundContractName}${extension}`);
        assertExistence(artifactPath);
    }
}

// TODO assert can be declared
// TODO move this somewhere else
