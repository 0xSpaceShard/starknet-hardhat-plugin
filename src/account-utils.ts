import { iterativelyCheckStatus, StarknetContract, StringMap } from "./types";
import { toBN } from "starknet/utils/number";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { ec } from "elliptic";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import path from "path";
import {
    ABI_SUFFIX,
    INTERNAL_ARTIFACTS_DIR,
    TransactionHashPrefix,
    TRANSACTION_VERSION,
    StarknetChainId
} from "./constants";
import { numericToHexString } from "./utils";
import * as crypto from "crypto";
import { hash } from "starknet";
import axios, { AxiosError } from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import * as starknet from "./starknet-types";

export type CallParameters = {
    toContract: StarknetContract;
    functionName: string;
    calldata?: StringMap;
};

type KeysType = {
    publicKey: string;
    privateKey: string;
    keyPair: ec.KeyPair;
};

/*
 * Helper cryptography functions for Key generation and message signing
 */

export function generateRandomStarkPrivateKey(length = 63) {
    const characters = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(crypto.randomInt(characters.length));
    }
    return toBN(result, "hex");
}

export function signMultiCall(
    publicKey: string,
    keyPair: ec.KeyPair,
    messageHash: string
): bigint[] {
    if (publicKey === "0x0") {
        return [BigInt(0), BigInt(0)];
    }
    return ellipticCurve.sign(keyPair, BigInt(messageHash).toString(16)).map(BigInt);
}

/**
 * Move from an internal directory to the user's artifacts.
 * @param contractDir the subdirectory internally holding the artifact
 * @returns the new path where the artifacts can be found
 */
export function handleInternalContractArtifacts(
    contractDir: string,
    contractName: string,
    artifactsVersion: string,
    hre: HardhatRuntimeEnvironment
): string {
    // Name of the artifacts' parent folder
    const artifactsBase = contractName + ".cairo";

    const baseArtifactsPath = path.join(hre.config.paths.starknetArtifacts, INTERNAL_ARTIFACTS_DIR);

    // Full path to where the artifacts will be saved
    const artifactsTargetPath = path.join(
        baseArtifactsPath,
        contractDir,
        artifactsVersion,
        artifactsBase
    );

    const jsonArtifact = contractName + ".json";
    const abiArtifact = contractName + ABI_SUFFIX;

    const artifactsSourcePath = path.join(
        __dirname,
        "..", // necessary since artifact dir is in the root, not in src
        INTERNAL_ARTIFACTS_DIR,
        contractDir,
        artifactsVersion,
        artifactsBase
    );

    ensureArtifact(jsonArtifact, artifactsTargetPath, artifactsSourcePath);
    ensureArtifact(abiArtifact, artifactsTargetPath, artifactsSourcePath);

    return artifactsTargetPath;
}

/**
 * Checks if the provided artifact exists in the project's artifacts folder.
 * If it doesn't exist, it is downloaded from the GitHub repository.
 * @param fileName artifact file to download. E.g. "Account.json" or "Account_abi.json"
 * @param artifactsTargetPath folder to where the artifacts will be downloaded. E.g. "project/starknet-artifacts/Account.cairo"
 * @param artifactSourcePath path to the folder where the artifacts are stored
 */
function ensureArtifact(fileName: string, artifactsTargetPath: string, artifactSourcePath: string) {
    const finalTargetPath = path.join(artifactsTargetPath, fileName);
    if (!fs.existsSync(finalTargetPath)) {
        fs.mkdirSync(artifactsTargetPath, { recursive: true });

        const finalSourcePath = path.join(artifactSourcePath, fileName);
        fs.copyFileSync(finalSourcePath, finalTargetPath);
    }
}

/**
 * If no privateKey provided, generates random values, otherwise calculates from the
 * provided key.
 * @param providedPrivateKey hex string private key to use for generating the public key
 * @returns an object with public, private key and key pair
 */
export function generateKeys(providedPrivateKey?: string): KeysType {
    const starkPrivateKey = providedPrivateKey
        ? toBN(providedPrivateKey.replace(/^0x/, ""), 16)
        : generateRandomStarkPrivateKey();
    const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
    const publicKey = ellipticCurve.getStarkKey(keyPair);
    const privateKey = "0x" + starkPrivateKey.toString(16);
    return { publicKey, privateKey, keyPair };
}

const INITIAL_NONCE = "0x0";

export function calculateDeployAccountHash(
    accountAddress: string,
    constructorCalldata: string[],
    salt: string,
    classHash: string,
    maxFee: string,
    chainId: StarknetChainId
) {
    const calldataHash = hash.computeHashOnElements([classHash, salt, ...constructorCalldata]);
    return hash.computeHashOnElements([
        TransactionHashPrefix.DEPLOY_ACCOUNT,
        numericToHexString(TRANSACTION_VERSION),
        accountAddress,
        0, // entrypoint selector is implied
        calldataHash,
        maxFee,
        chainId,
        INITIAL_NONCE
    ]);
}

export async function sendDeployAccountTx(
    signatures: string[],
    classHash: string,
    constructorCalldata: string[],
    salt: string,
    maxFee: string
) {
    const hre = await import("hardhat");
    const resp = await axios
        .post(`${hre.starknet.networkConfig.url}/gateway/add_transaction`, {
            max_fee: maxFee,
            signature: signatures,
            nonce: INITIAL_NONCE,
            class_hash: classHash,
            contract_address_salt: salt,
            constructor_calldata: constructorCalldata,
            version: numericToHexString(TRANSACTION_VERSION),
            type: "DEPLOY_ACCOUNT"
        })
        .catch((error: AxiosError) => {
            const msg = `Deploying account failed: ${error.response.data.message}`;
            throw new StarknetPluginError(msg, error);
        });

    return new Promise<string>((resolve, reject) => {
        iterativelyCheckStatus(
            resp.data.transaction_hash,
            hre.starknetWrapper,
            () => resolve(resp.data.transaction_hash),
            reject
        );
    });
}

export async function sendEstimateFeeTx(data: unknown) {
    const hre = await import("hardhat");
    // To resolve TypeError: Do not know how to serialize a BigInt
    // coming from axios
    (BigInt.prototype as any).toJSON = function () {
        return this.toString();
    };

    const resp = await axios.post(
        `${hre.starknet.networkConfig.url}/feeder_gateway/estimate_fee`,
        data
    );

    const { gas_price, gas_usage, overall_fee, unit } = resp.data;
    return {
        amount: BigInt(overall_fee),
        unit,
        gas_price: BigInt(gas_price),
        gas_usage: BigInt(gas_usage)
    } as starknet.FeeEstimation;
}
