import { Numeric, StarknetContract, StringMap } from "./types";
import { Call, hash, RawCalldata } from "starknet";
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
    GITHUB_ACCOUNT_ARTIFACTS_URL
} from "./constants";
import axios from "axios";

export type CallParameters = {
    toContract: StarknetContract;
    functionName: string;
    calldata?: StringMap;
};

type executeCallParameters = {
    to: bigint;
    selector: BigNumberish;
    data_offset: number;
    data_len: number;
};

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

export function signMultiCall(
    publicKey: string,
    keyPair: ec.KeyPair,
    messageHash: string
): bigint[] {
    let signatures: bigint[] = [];
    if (publicKey !== "0") {
        const signature = ellipticCurve
            .sign(keyPair, BigInt(messageHash).toString(16))
            .map((str) => BigInt(str));
        signatures.push(signature[0]);
        signatures.push(signature[1]);
    } else {
        signatures.concat([BigInt(0), BigInt(0)]);
    }
    return signatures;
}

export function handleMultiCall(
    accountAddress: string,
    callParameters: CallParameters[],
    nonce: any
) {
    let callArray: Call[] = [];

    callParameters.forEach((callParameters) => {
        callArray.push({
            contractAddress: callParameters.toContract.address,
            entrypoint: callParameters.functionName,
            calldata: callParameters.toContract.adaptInput(
                callParameters.functionName,
                callParameters.calldata
            )
        });
    });

    let executeCallArray: executeCallParameters[] = [];
    let rawCalldata: RawCalldata = [];

    callArray.forEach((call) => {
        executeCallArray.push({
            to: BigInt(call.contractAddress),
            selector: hash.starknetKeccak(call.entrypoint),
            data_offset: rawCalldata.length,
            data_len: call.calldata.length
        });
        rawCalldata = rawCalldata.concat(call.calldata);
    });

    const messageHash = hash.hashMulticall(accountAddress, callArray, nonce, "0");

    const args = {
        call_array: executeCallArray,
        calldata: rawCalldata,
        nonce: nonce
    };
    return { messageHash, args };
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

    const signedMessage = ellipticCurve
        .sign(keyPair, BigInt(msgHash).toString(16))
        .map((str) => BigInt(str));

    return signedMessage;
}

export async function handleAccountContractArtifacts(
    accountType: string,
    artifactsName: string,
    hre: HardhatRuntimeEnvironment
): Promise<string> {
    // Name of the artifacts' parent folder
    const artifactsBase = artifactsName + ".cairo";

    const baseArtifactsPath = path.join(
        hre.config.paths.starknetArtifacts,
        ACCOUNT_CONTRACT_ARTIFACTS_ROOT_PATH
    );

    // Remove old versions from the path
    if (fs.existsSync(baseArtifactsPath)) {
        const contents = fs.readdirSync(baseArtifactsPath);
        contents
            .filter((content) => content !== ACCOUNT_ARTIFACTS_VERSION)
            .forEach((content) => {
                fs.rmSync(path.join(baseArtifactsPath, content), {
                    recursive: true,
                    force: true
                });
            });
    }

    // Full path to where the artifacts will be saved
    const artifactsTargetPath = path.join(
        baseArtifactsPath,
        ACCOUNT_ARTIFACTS_VERSION,
        artifactsBase
    );

    const jsonArtifact = artifactsName + ".json";
    const abiArtifact = artifactsName + ABI_SUFFIX;

    const artifactLocationUrl = GITHUB_ACCOUNT_ARTIFACTS_URL.concat(
        accountType,
        "/",
        artifactsBase,
        "/"
    );

    await assertArtifact(jsonArtifact, artifactsTargetPath, artifactLocationUrl);
    await assertArtifact(abiArtifact, artifactsTargetPath, artifactLocationUrl);

    return artifactsTargetPath;
}

/**
 * Checks if the provided artifact exists in the project's artifacts folder.
 * If it doesen't, downloads it from the GitHub repository "https://github.com/Shard-Labs/starknet-hardhat-example"
 * @param artifact artifact file to download. E.g. "Account.json" or "Account_abi.json"
 * @param artifactsTargetPath folder to where the artifacts will be downloaded. E.g. "project/starknet-artifacts/Account.cairo"
 * @param artifactLocationUrl url to the github folder where the artifacts are stored
 */
async function assertArtifact(
    artifact: string,
    artifactsTargetPath: string,
    artifactLocationUrl: string
) {
    // Download artifact if it doesen't exist
    if (!fs.existsSync(path.join(artifactsTargetPath, artifact))) {
        fs.mkdirSync(artifactsTargetPath, { recursive: true });

        const rawFileURL = artifactLocationUrl.concat(artifact);

        const response = await axios.get(rawFileURL, {
            transformResponse: (res) => {
                return res;
            },
            responseType: "json"
        });

        fs.writeFileSync(path.join(artifactsTargetPath, artifact), response.data);
    }
}
