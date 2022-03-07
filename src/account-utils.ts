import { Numeric } from "./types";
import { hash } from "starknet";
import { BigNumberish, toBN } from "starknet/utils/number";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { ec } from "elliptic";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import path from "path";
import {
    ABI_SUFFIX,
    ACCOUNT_ARTIFACTS_VERSION,
    ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH,
    GITHUB_ACCOUNT_SHA_URL
} from "./constants";
import axios from "axios";

/*
 * Helper cryptography functions for Key generation and message signing
 */

export function generateRandomStarkPrivateKey(length = 63) {
    const characters = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return toBN(result, "hex");
}

/**
 * Returns a signature which is the result of signing a message
 *
 * @param keyPair
 * @param accountAddress
 * @param nonce
 * @param functionSelector
 * @param toAddress
 * @param calldata
 * @returns the signature
 */
export function sign(
    keyPair: ec.KeyPair,
    accountAddress: string,
    nonce: BigNumberish,
    functionSelector: string,
    toAddress: string,
    calldata: BigNumberish[]
): Numeric[] {
    const msgHash = hash.computeHashOnElements([
        toBN(accountAddress.substring(2), "hex"),
        toBN(toAddress.substring(2), "hex"),
        functionSelector,
        toBN(hash.computeHashOnElements(calldata).substring(2), "hex"),
        nonce
    ]);

    const signedMessage = ellipticCurve.sign(keyPair, BigInt(msgHash).toString(16));
    const signature = [
        BigInt("0x" + signedMessage[0].toString(16)),
        BigInt("0x" + signedMessage[1].toString(16))
    ];
    return signature;
}

export async function handleAccountContractArtifacts(
    accountType: string,
    artifactsName: string,
    hre: HardhatRuntimeEnvironment
) {
    // Name of the artifacts' parent folder
    const targetPath = artifactsName + ".cairo";

    // Full path to where the artifacts will be saved
    const artifactsTargetPath = path.join(
        hre.config.paths.starknetArtifacts,
        ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH,
        ACCOUNT_ARTIFACTS_VERSION,
        targetPath
    );

    if (!fs.existsSync(artifactsTargetPath)) {
        const baseArtifactsPath = path.join(
            hre.config.paths.starknetArtifacts,
            ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH
        );
        if (fs.existsSync(baseArtifactsPath)) {
            fs.rmSync(baseArtifactsPath, { recursive: true, force: true });
        }

        const artifacts = {
            json: artifactsName + ".json",
            abi: artifactsName + ABI_SUFFIX
        };

        fs.mkdirSync(artifactsTargetPath, { recursive: true });

        const githubTree = GITHUB_ACCOUNT_SHA_URL.concat("/", accountType, "/", targetPath);

        let jsonBlobUrl, abiBlobUrl;

        // Get the url to the file blobs through the github api tree, because if the files are too large, the regular method of retrieving will not work
        await axios({
            method: "get",
            url: githubTree
        }).then(async (response) => {
            jsonBlobUrl = response.data.tree.find(
                (artifact: any) => artifact.path === artifacts.json
            ).url;
            abiBlobUrl = response.data.tree.find(
                (artifact: any) => artifact.path === artifacts.abi
            ).url;
        });

        const jsonBase64 = (await axios.get(jsonBlobUrl)).data.content;
        const abiBase64 = (await axios.get(abiBlobUrl)).data.content;

        fs.writeFileSync(path.join(artifactsTargetPath, artifacts.json), jsonBase64, {
            encoding: "base64"
        });
        fs.writeFileSync(path.join(artifactsTargetPath, artifacts.abi), abiBase64, {
            encoding: "base64"
        });
    }
}
