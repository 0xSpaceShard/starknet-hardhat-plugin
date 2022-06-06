import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";
import { readFile } from "fs/promises";

import { ABI_SUFFIX, PLUGIN_NAME } from "../constants";
import { checkArtifactExists, findPath } from "../utils";
import { ContractFactory, defaultProvider, json } from "starknet";

export async function getContractFactory(hre: HardhatRuntimeEnvironment, contractPath: string) {
    const artifactsPath = hre.config.paths.starknetArtifacts;
    checkArtifactExists(artifactsPath);

    contractPath = contractPath.replace(/\.[^/.]+$/, ""); // remove extension

    const metadataSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}.json`
    );

    const metadataPath = await findPath(artifactsPath, metadataSearchTarget);
    if (!metadataPath) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Could not find metadata for contract "${contractPath}.cairo"`
        );
    }

    const abiSearchTarget = path.join(
        `${contractPath}.cairo`,
        `${path.basename(contractPath)}${ABI_SUFFIX}`
    );
    const abiPath = await findPath(artifactsPath, abiSearchTarget);
    if (!abiPath) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Could not find ABI for contract "${contractPath}.cairo"`
        );
    }

    const compiledContract = json.parse(await readFile(metadataPath, "utf8"));
    const abi = json.parse(await readFile(abiPath, "utf8"));

    return new ContractFactory(compiledContract, defaultProvider, abi);
}
