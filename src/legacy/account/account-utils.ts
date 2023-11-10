import { AxiosError } from "axios";
import { HardhatRuntimeEnvironment, StarknetContract, StringMap } from "hardhat/types";
import fs from "node:fs";
import path from "node:path";
import { EstimateFeeResponse, RpcProvider, SierraContractClass, ec, hash, stark } from "starknet";

import {
    INTERNAL_ARTIFACTS_DIR,
    ABI_SUFFIX,
    StarknetChainId,
    TransactionHashPrefix,
    TRANSACTION_VERSION
} from "../../constants";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { Numeric, starknetTypes } from "../../types";
import { numericToHexString } from "../../utils";
import { Cairo1ContractClass } from "../contract";
import { iterativelyCheckStatus } from "../utils";

export type CallParameters = {
    toContract: StarknetContract;
    functionName: string;
    calldata?: StringMap;
};

type KeysType = {
    publicKey: string;
    privateKey: string;
};

export function signMultiCall(messageHash: string, privateKey: string): bigint[] {
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    if (publicKey === "0x0") {
        return [BigInt(0), BigInt(0)];
    }
    const signature = ec.starkCurve.sign(BigInt(messageHash).toString(16), privateKey);
    return [signature.r, signature.s];
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
        __dirname.match(/^.*dist\//)[0], // necessary since artifact dir is in the root
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
    const privateKey = providedPrivateKey ?? stark.randomAddress();
    const publicKey = ec.starkCurve.getStarkKey(privateKey);
    return { publicKey, privateKey };
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
    const response = await (hre.starknetProvider as RpcProvider)
        .deployAccountContract(
            {
                classHash,
                constructorCalldata,
                addressSalt: salt,
                signature: signatures
            },
            {
                maxFee,
                nonce: INITIAL_NONCE,
                version: numericToHexString(TRANSACTION_VERSION)
            }
        )
        .catch((error: AxiosError<starknetTypes.StarkError>) => {
            const msg = `Deploying account failed: ${error.response.data.message}`;
            throw new StarknetPluginError(msg, error);
        });

    return new Promise<string>((resolve, reject) => {
        iterativelyCheckStatus(
            response.transaction_hash,
            hre,
            () => resolve(response.transaction_hash),
            reject
        );
    });
}

export async function sendDeclareV2Tx(
    signatures: string[],
    compiledClassHash: string,
    maxFee: Numeric,
    senderAddress: string,
    version: Numeric,
    nonce: Numeric,
    contractClass: Cairo1ContractClass
) {
    const hre = await import("hardhat");
    const response = await hre.starknetProvider
        .declareContract(
            {
                compiledClassHash,
                senderAddress,
                contract: contractClass.getCompiledClass() as SierraContractClass,
                signature: signatures
            },
            {
                maxFee,
                nonce,
                version
            }
        )
        .catch((error) => {
            const msg = `Declaring contract failed: ${error.message}`;
            throw new StarknetPluginError(msg, error);
        });

    return new Promise<string>((resolve, reject) => {
        iterativelyCheckStatus(
            response.transaction_hash,
            hre,
            () => resolve(response.transaction_hash),
            reject
        );
    });
}

export function mapToLegacyFee(estimate: EstimateFeeResponse): starknetTypes.FeeEstimation {
    return {
        amount: estimate.overall_fee,
        unit: "wei",
        gas_price: estimate.gas_price,
        gas_usage: estimate.gas_consumed
    };
}
