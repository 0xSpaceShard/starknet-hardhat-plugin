import { toBN } from "starknet/utils/number";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { ec } from "elliptic";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import path from "path";

import { ABI_SUFFIX, ACCOUNT_ARTIFACTS_DIR } from "./constants";

type KeysType = {
    publicKey: string;
    privateKey: string;
    keyPair: ec.KeyPair;
};

/*
 * Helper cryptography functions for Key generation and message signing
 */

function generateRandomStarkPrivateKey(length = 63) {
    const characters = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return toBN(result, "hex");
}

export async function handleAccountContractArtifacts(
    accountType: string,
    artifactsName: string,
    artifactsVersion: string,
    hre: HardhatRuntimeEnvironment
): Promise<string> {
    // Name of the artifacts' parent folder
    const artifactsBase = artifactsName + ".cairo";

    const baseArtifactsPath = path.join(hre.config.paths.starknetArtifacts, ACCOUNT_ARTIFACTS_DIR);

    // Full path to where the artifacts will be saved
    const artifactsTargetPath = path.join(
        baseArtifactsPath,
        accountType,
        artifactsVersion,
        artifactsBase
    );

    const jsonArtifact = artifactsName + ".json";
    const abiArtifact = artifactsName + ABI_SUFFIX;

    const artifactsSourcePath = path.join(
        __dirname,
        "..", // necessary since artifact dir is in the root, not in src
        ACCOUNT_ARTIFACTS_DIR,
        accountType,
        artifactsVersion,
        artifactsBase
    );

    await ensureArtifact(jsonArtifact, artifactsTargetPath, artifactsSourcePath);
    await ensureArtifact(abiArtifact, artifactsTargetPath, artifactsSourcePath);

    return artifactsTargetPath;
}

/**
 * Checks if the provided artifact exists in the project's artifacts folder.
 * If it doesn't exist, it is downloaded from the GitHub repository.
 * @param fileName artifact file to download. E.g. "Account.json" or "Account_abi.json"
 * @param artifactsTargetPath folder to where the artifacts will be downloaded. E.g. "project/starknet-artifacts/Account.cairo"
 * @param artifactSourcePath path to the folder where the artifacts are stored
 */
async function ensureArtifact(
    fileName: string,
    artifactsTargetPath: string,
    artifactSourcePath: string
) {
    const finalTargetPath = path.join(artifactsTargetPath, fileName);
    if (!fs.existsSync(finalTargetPath)) {
        fs.mkdirSync(artifactsTargetPath, { recursive: true });

        const finalSourcePath = path.join(artifactSourcePath, fileName);
        fs.copyFileSync(finalSourcePath, finalTargetPath);
    }
}

export function generateKeys(providedKey?: string): KeysType {
    const starkPrivateKey = providedKey
        ? toBN(providedKey.replace(/^0x/, ""), 16)
        : generateRandomStarkPrivateKey();
    const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
    const publicKey = ellipticCurve.getStarkKey(keyPair);
    const privateKey = "0x" + starkPrivateKey.toString(16);
    return { publicKey, privateKey, keyPair };
}
