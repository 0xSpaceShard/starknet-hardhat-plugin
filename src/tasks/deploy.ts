import * as path from "path";
import * as fs from "fs";
import { defaultProvider } from "starknet";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

import { traverseFiles, checkArtifactExists, findPath } from "../utils";

function isStarknetCompilationArtifact(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch (err) {
        return false;
    }

    return !!parsed.entry_points_by_type;
}

export async function starknetDeployAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const defaultArtifactsPath = hre.config.paths.starknetArtifacts;
    const artifactsPaths: string[] = args.paths || [defaultArtifactsPath];
    const intRegex = new RegExp(/^-?\d+$/);

    const txHashes: string[] = [];

    for (let artifactsPath of artifactsPaths) {
        if (intRegex.test(artifactsPath)) {
            console.warn(
                "\x1b[33m%s\x1b[0m",
                `Warning! Found an integer "${artifactsPath}" as an artifact path.\n` +
                    "Make sure that all inputs are passed within a single string (e.g --inputs '10 20 30')"
            );
        }
        // Check if input is the name of the contract and not a path
        if (artifactsPath === path.basename(artifactsPath)) {
            const metadataSearchTarget = path.join(
                `${artifactsPath}.cairo`,
                `${path.basename(artifactsPath)}.json`
            );
            artifactsPath = await findPath(defaultArtifactsPath, metadataSearchTarget);
        } else if (!path.isAbsolute(artifactsPath)) {
            artifactsPath = path.normalize(path.join(hre.config.paths.root, artifactsPath));
        }
        checkArtifactExists(artifactsPath);
        const paths = await traverseFiles(artifactsPath, "*.json");

        const contractPaths = paths.filter(isStarknetCompilationArtifact);
        for (const contractPath of contractPaths) {
            console.log("Deploying", contractPath);

            const contractFactory = await hre.starknet.getContractFactory(contractPath);
            const result = await contractFactory.deploy(args.inputs?.split(/\s+/), args.salt);

            if (args.wait && result.deployTransactionHash) {
                txHashes.push(result.deployTransactionHash);
            }
        }
    }

    if (args.wait) {
        // If the "wait" flag was passed as an argument, check the previously stored transaction hashes for their statuses
        console.log(`Checking deployment transaction${txHashes.length === 1 ? "" : "s"}...`);
        const promises = txHashes.map(
            (hash) =>
                new Promise<void>((resolve, reject) => {
                    return defaultProvider
                        .waitForTransaction(hash)
                        .then(async () => {
                            const transactionResponse = await defaultProvider.getTransaction(hash);
                            console.log(
                                `Deployment transaction ${hash} is now ${transactionResponse.status}`
                            );
                            resolve();
                        })
                        .catch((error) => {
                            console.log(`Deployment transaction ${hash} is REJECTED`);
                            reject(error);
                        });
                })
        );
        await Promise.allSettled(promises);
    }
}
