import { ec, hash, BigNumberish, Call, RawCalldata } from "starknet";

import { QUERY_VERSION, StarknetChainId, TransactionHashPrefix } from "../../constants";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { DeployAccountOptions, starknetTypes } from "../../types";
import { StarknetContract, StarknetContractFactory } from "../contract";
import {
    numericToHexString,
    generateRandomSalt,
    bnToDecimalStringArray,
    estimatedFeeToMaxFee
} from "../../utils";
import {
    calculateDeployAccountHash,
    generateKeys,
    handleInternalContractArtifacts,
    sendDeployAccountTx,
    sendEstimateFeeTx,
    signMultiCall
} from "./account-utils";
import { Account } from "./account";

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */

export class OpenZeppelinAccount extends Account {
    private static contractFactory: StarknetContractFactory;

    protected constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        salt: string,
        deployed: boolean
    ) {
        super(starknetContract, privateKey, salt, deployed);
    }

    private static async getContractFactory() {
        const hre = await import("hardhat");
        if (!this.contractFactory) {
            const contractPath = handleInternalContractArtifacts(
                "OpenZeppelinAccount",
                "Account",
                "0.5.1",
                hre
            );
            this.contractFactory = await hre.starknetLegacy.getContractFactory(contractPath);
        }
        return this.contractFactory;
    }

    /**
     * Generates a new key pair if none specified.
     * The created account needs to be deployed using the `deployAccount` method.
     * @param options
     * @returns an undeployed instance of account
     */
    public static async createAccount(
        options: {
            salt?: string;
            privateKey?: string;
        } = {}
    ): Promise<OpenZeppelinAccount> {
        const signer = generateKeys(options.privateKey);
        const salt = options.salt || generateRandomSalt();
        const contractFactory = await this.getContractFactory();
        const address = hash.calculateContractAddressFromHash(
            salt,
            await contractFactory.getClassHash(),
            [signer.publicKey],
            "0x0" // deployer address
        );
        const contract = contractFactory.getContractAt(address);
        return new this(contract, signer.privateKey, salt, false);
    }

    protected override getMessageHash(
        transactionHashPrefix: TransactionHashPrefix,
        accountAddress: string,
        callArray: Call[],
        nonce: string,
        maxFee: string,
        version: string,
        chainId: StarknetChainId
    ): string {
        const hashable: BigNumberish[] = [callArray.length];
        const rawCalldata: RawCalldata = [];
        callArray.forEach((call) => {
            const calldata = call.calldata as BigNumberish[];
            hashable.push(
                call.contractAddress,
                hash.starknetKeccak(call.entrypoint),
                rawCalldata.length,
                calldata.length
            );
            rawCalldata.push(...calldata);
        });

        hashable.push(rawCalldata.length, ...rawCalldata);
        const calldataHash = hash.computeHashOnElements(hashable);
        return hash.computeHashOnElements([
            transactionHashPrefix,
            version,
            accountAddress,
            0,
            calldataHash,
            maxFee,
            chainId,
            nonce
        ]);
    }

    protected override getSignatures(messageHash: string): bigint[] {
        return signMultiCall(messageHash, this.privateKey);
    }

    public override async estimateDeployAccountFee(): Promise<starknetTypes.FeeEstimation> {
        this.assertNotDeployed();
        const hre = await import("hardhat");

        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const classHash = await contractFactory.getClassHash();
        const constructorCalldata = [BigInt(this.publicKey).toString()];

        const maxFee = numericToHexString(0);
        const nonce = numericToHexString(0);

        const calldataHash = hash.computeHashOnElements([
            classHash,
            this.salt,
            ...constructorCalldata
        ]);
        const msgHash = hash.computeHashOnElements([
            TransactionHashPrefix.DEPLOY_ACCOUNT,
            numericToHexString(QUERY_VERSION),
            this.address,
            0,
            calldataHash,
            maxFee,
            hre.starknet.networkConfig.starknetChainId,
            nonce
        ]);

        const signature = this.getSignatures(msgHash);
        const data = {
            type: "DEPLOY_ACCOUNT",
            class_hash: classHash,
            constructor_calldata: constructorCalldata,
            contract_address_salt: this.salt,
            signature: bnToDecimalStringArray(signature || []),
            version: numericToHexString(QUERY_VERSION),
            nonce
        };

        return await sendEstimateFeeTx(data);
    }

    public override async deployAccount(options: DeployAccountOptions = {}): Promise<string> {
        this.assertNotDeployed();
        const hre = await import("hardhat");

        let maxFee = options?.maxFee;
        if (maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        if (maxFee === undefined || maxFee === null) {
            const estimatedDeployFee = await this.estimateDeployAccountFee();
            maxFee = estimatedFeeToMaxFee(estimatedDeployFee.amount, options?.overhead);
        }

        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const classHash = await contractFactory.getClassHash();
        const constructorCalldata = [BigInt(this.publicKey).toString()];

        const msgHash = calculateDeployAccountHash(
            this.address,
            constructorCalldata,
            this.salt,
            classHash,
            numericToHexString(maxFee),
            hre.starknet.networkConfig.starknetChainId
        );

        const deploymentTxHash = await sendDeployAccountTx(
            this.getSignatures(msgHash).map((val) => val.toString()),
            classHash,
            constructorCalldata,
            this.salt,
            numericToHexString(maxFee)
        );

        this.starknetContract.deployTxHash = deploymentTxHash;
        this.deployed = true;
        return deploymentTxHash;
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string
    ): Promise<OpenZeppelinAccount> {
        const contractFactory = await this.getContractFactory();
        const contract = contractFactory.getContractAt(address);

        const { publicKey: expectedPubKey } = await contract.call("getPublicKey");
        const publicKey = ec.starkCurve.getStarkKey(privateKey);

        if (BigInt(publicKey) !== expectedPubKey) {
            throw new StarknetPluginError(
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new this(contract, privateKey, undefined, true);
    }
}
