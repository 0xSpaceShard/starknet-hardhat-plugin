import path from "path";
import { assertExistence, assertNotEmpty } from "./utils";
import { hardhatStarknetRun, hardhatStarknetTest } from "./cli-functions";

const DEFAULT_PACKAGE_NAME = "sample_package_name";

/**
 * Assert that artifacts of a project exist
 * @param projectName the name of the project
 */
export function scarbArtifactsAssertion(
    projectName: string,
    packageName = DEFAULT_PACKAGE_NAME,
    contractNames = ["FirstContract", "AnotherContract", "FibContract"],
    extensions = [".json", "_abi.json", ".casm"]
) {
    const projectPath = path.join("starknet-artifacts", projectName);
    for (const contractName of contractNames) {
        const compoundContractName = `${packageName}_${contractName}`;
        const contractDirPath = path.join(projectPath, `${compoundContractName}.cairo`);
        for (const extension of extensions) {
            const artifactPath = path.join(contractDirPath, `${compoundContractName}${extension}`);
            assertExistence(artifactPath);
            assertNotEmpty(artifactPath);
        }
    }
}

function assertDeclarable(
    packageName = DEFAULT_PACKAGE_NAME,
    contractNames = ["FirstContract", "AnotherContract"]
) {
    // attempt declaration for all contracts except FibContract
    for (const contractName of contractNames) {
        const compoundContractName = `${packageName}_${contractName}`;

        // the script requires the environment variable, but let's store it just in case
        const oldEnvVarValue = process.env.DECLARABLE_CONTRACT;
        process.env.DECLARABLE_CONTRACT = compoundContractName;
        try {
            hardhatStarknetRun(["scripts/declare.ts"]);
        } finally {
            // restore
            process.env.DECLARABLE_CONTRACT = oldEnvVarValue;
        }
    }
}

/**
 * Asserts existence, non-emptiness, declarableness, interactivity of the contracts
 * from a project built by Scarb.
 * @param projectName the name of the built project
 */
export function scarbAssertions(projectName: string, packageName = DEFAULT_PACKAGE_NAME) {
    scarbArtifactsAssertion(projectName);

    assertDeclarable(packageName);

    // attempt full declare+deploy+call on FibContract
    // if it was declared earlier with the rest, this script would fail
    hardhatStarknetTest(["test/cairo1/fib-contract.test.ts"]);
}
