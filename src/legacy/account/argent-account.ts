import { ec, hash, selector, BigNumberish, Call, RawCalldata } from "starknet";

import { QUERY_VERSION, StarknetChainId, TransactionHashPrefix } from "../../constants";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { DeployAccountOptions, InvokeOptions, starknetTypes } from "../../types";
import {
    numericToHexString,
    generateRandomSalt,
    bnToDecimalStringArray,
    estimatedFeeToMaxFee
} from "../../utils";
import { StarknetContract, StarknetContractFactory } from "../contract";
import {
    calculateDeployAccountHash,
    CallParameters,
    generateKeys,
    handleInternalContractArtifacts,
    mapToLegacyFee,
    sendDeployAccountTx,
    signMultiCall
} from "./account-utils";
import { Account } from "./account";

/**
 * Wrapper for the Argent implementation of Account
 */

export class ArgentAccount extends Account {
    private static readonly VERSION: string = "780760e4156afe592bb1feff7e769cf279ae9831";

    private static proxyContractFactory: StarknetContractFactory;
    private static implementationContractFactory: StarknetContractFactory;

    private static readonly PROXY_CLASS_HASH =
        "0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918";
    private static readonly IMPLEMENTATION_CLASS_HASH =
        "0x33434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2";

    public guardianPublicKey: string;
    public guardianPrivateKey: string;

    protected constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        guardianPrivateKey: string,
        salt: string,
        deployed: boolean
    ) {
        super(starknetContract, privateKey, salt, deployed);
        this.guardianPrivateKey = guardianPrivateKey;
        if (this.guardianPrivateKey) {
            const guardianSigner = generateKeys(this.guardianPrivateKey);
            this.guardianPublicKey = guardianSigner.publicKey;
        }
    }

    private static async getImplementationContractFactory() {
        const hre = await import("hardhat");
        if (!this.implementationContractFactory) {
            const contractPath = handleInternalContractArtifacts(
                "ArgentAccount",
                "ArgentAccount",
                this.VERSION,
                hre
            );
            this.implementationContractFactory = await hre.starknetLegacy.getContractFactory(
                contractPath
            );
        }
        return this.implementationContractFactory;
    }

    private static async getProxyContractFactory() {
        const hre = await import("hardhat");
        if (!this.proxyContractFactory) {
            const contractPath = handleInternalContractArtifacts(
                "ArgentAccount",
                "Proxy",
                this.VERSION,
                hre
            );
            this.proxyContractFactory = await hre.starknetLegacy.getContractFactory(contractPath);
        }
        return this.proxyContractFactory;
    }

    private static generateGuardianPublicKey(guardianPrivateKey: string) {
        if (!guardianPrivateKey) {
            return "0x0";
        }
        return generateKeys(guardianPrivateKey).publicKey;
    }

    /**
     * Generates a new key pair if none specified.
     * Does NOT generate a new guardian key pair if none specified.
     * If you don't specify a guardian private key, no guardian will be assigned.
     * The created account needs to be deployed using the `deployAccount` method.
     * @param options
     * @returns an undeployed instance of account
     */
    public static async createAccount(
        options: {
            salt?: string;
            privateKey?: string;
            guardianPrivateKey?: string;
        } = {}
    ): Promise<ArgentAccount> {
        const signer = generateKeys(options.privateKey);
        const guardianPrivateKey = options?.guardianPrivateKey;
        const guardianPublicKey = this.generateGuardianPublicKey(guardianPrivateKey);
        const salt = options.salt || generateRandomSalt();
        const constructorCalldata = [
            this.IMPLEMENTATION_CLASS_HASH,
            selector.getSelectorFromName("initialize"),
            "2",
            signer.publicKey,
            guardianPublicKey
        ];
        const address = hash.calculateContractAddressFromHash(
            salt,
            this.PROXY_CLASS_HASH,
            constructorCalldata,
            "0x0" // deployer address
        );

        const proxyContractFactory = await this.getProxyContractFactory();
        const contract = proxyContractFactory.getContractAt(address);
        return new this(contract, signer.privateKey, guardianPrivateKey, salt, false);
    }

    protected getMessageHash(
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
                selector.starknetKeccak(call.entrypoint),
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
        const signatures = signMultiCall(messageHash, this.privateKey);
        if (this.guardianPrivateKey) {
            const guardianSignatures = signMultiCall(messageHash, this.guardianPrivateKey);
            signatures.push(...guardianSignatures);
        }
        return signatures;
    }

    public override async estimateDeployAccountFee(): Promise<starknetTypes.FeeEstimation> {
        this.assertNotDeployed();
        const hre = await import("hardhat");

        const nonce = numericToHexString(0);
        const maxFee = numericToHexString(0);

        const constructorCalldata: string[] = [
            ArgentAccount.IMPLEMENTATION_CLASS_HASH,
            selector.getSelectorFromName("initialize"),
            "2",
            this.publicKey,
            ArgentAccount.generateGuardianPublicKey(this.guardianPrivateKey)
        ].map((val) => BigInt(val).toString());
        const calldataHash = hash.computeHashOnElements([
            ArgentAccount.PROXY_CLASS_HASH,
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

        const estimate = await hre.starknetProvider.getDeployAccountEstimateFee(
            {
                classHash: ArgentAccount.PROXY_CLASS_HASH,
                constructorCalldata,
                addressSalt: this.salt,
                signature: bnToDecimalStringArray(signature || [])
            },
            {
                maxFee,
                nonce,
                version: numericToHexString(QUERY_VERSION)
            }
        );
        return mapToLegacyFee(estimate);
    }

    /**
     * Deploys (initializes) the account.
     * @param options
     * @returns the tx hash of the deployment
     */
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

        const constructorCalldata: string[] = [
            ArgentAccount.IMPLEMENTATION_CLASS_HASH,
            selector.getSelectorFromName("initialize"),
            "2",
            this.publicKey,
            ArgentAccount.generateGuardianPublicKey(this.guardianPrivateKey)
        ].map((val) => BigInt(val).toString());

        const msgHash = calculateDeployAccountHash(
            this.address,
            constructorCalldata,
            this.salt,
            ArgentAccount.PROXY_CLASS_HASH,
            numericToHexString(maxFee),
            hre.starknet.networkConfig.starknetChainId
        );

        const deploymentTxHash = await sendDeployAccountTx(
            this.getSignatures(msgHash).map((val) => val.toString()),
            ArgentAccount.PROXY_CLASS_HASH,
            constructorCalldata,
            this.salt,
            numericToHexString(maxFee)
        );

        const implementationFactory = await ArgentAccount.getImplementationContractFactory();
        this.starknetContract.setImplementation(implementationFactory);
        this.starknetContract.deployTxHash = deploymentTxHash;
        this.deployed = true;
        return deploymentTxHash;
    }

    /**
     * Updates the guardian key in the contract. Set it to `undefined` to remove the guardian.
     * @param newGuardianPrivateKey private key of the guardian to update
     * @returns hash of the transaction which changes the guardian
     */
    public async setGuardian(
        newGuardianPrivateKey?: string,
        invokeOptions?: InvokeOptions
    ): Promise<string> {
        let guardianPublicKey: string;
        if (!BigInt(newGuardianPrivateKey || 0)) {
            newGuardianPrivateKey = undefined;
            guardianPublicKey = undefined;
        } else {
            guardianPublicKey = ec.starkCurve.getStarkKey(newGuardianPrivateKey);
        }

        const call: CallParameters = {
            functionName: "changeGuardian",
            toContract: this.starknetContract,
            calldata: { newGuardian: BigInt(guardianPublicKey || 0) }
        };

        const txHash = await this.multiInvoke([call], invokeOptions);

        // set after signing
        this.guardianPrivateKey = newGuardianPrivateKey;
        this.guardianPublicKey = guardianPublicKey;

        return txHash;
    }

    /**
     * Returns an account previously deployed to `address`.
     * A check is performed if the public key stored in the account matches the provided `privateKey`.
     * No check is done for the optional guardian private key.
     * @param address
     * @param privateKey
     * @param options
     * @returns the retrieved account
     */
    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        options: {
            guardianPrivateKey?: string;
        } = {}
    ): Promise<ArgentAccount> {
        const contractFactory = await this.getProxyContractFactory();
        const contract = contractFactory.getContractAt(address);
        const implementationFactory = await this.getImplementationContractFactory();
        contract.setImplementation(implementationFactory);

        const { signer: expectedPubKey } = await contract.call("getSigner");
        const publicKey = ec.starkCurve.getStarkKey(privateKey);

        if (expectedPubKey === BigInt(0)) {
            // not yet initialized
        } else if (BigInt(publicKey) !== expectedPubKey) {
            throw new StarknetPluginError(
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new this(contract, privateKey, options.guardianPrivateKey, undefined, true);
    }
}
