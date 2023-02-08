import {
    ContractInteractionFunction,
    DeclareOptions,
    DeployAccountOptions,
    DeployOptions,
    EstimateFeeOptions,
    InteractChoice,
    InteractOptions,
    InvokeOptions,
    InvokeResponse,
    Numeric,
    StarknetContract,
    StarknetContractFactory,
    StringMap
} from "./types";
import * as starknet from "./starknet-types";
import {
    QUERY_VERSION,
    StarknetChainId,
    TransactionHashPrefix,
    TRANSACTION_VERSION,
    UDC_DEPLOY_FUNCTION_NAME
} from "./constants";
import { StarknetPluginError } from "./starknet-plugin-error";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { BigNumberish, toBN } from "starknet/utils/number";
import { ec } from "elliptic";
import {
    calculateDeployAccountHash,
    CallParameters,
    generateKeys,
    handleInternalContractArtifacts,
    sendDeployAccountTx,
    sendEstimateFeeTx,
    signMultiCall
} from "./account-utils";
import {
    numericToHexString,
    copyWithBigint,
    generateRandomSalt,
    UDC,
    readContract,
    bnToDecimalStringArray,
    estimatedFeeToMaxFee
} from "./utils";
import { Call, hash, RawCalldata } from "starknet";
import { getTransactionReceiptUtil } from "./extend-utils";

type ExecuteCallParameters = {
    to: bigint;
    selector: BigNumberish;
    data_offset: number;
    data_len: number;
};

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {
    public publicKey: string;
    public keyPair: ec.KeyPair;

    protected constructor(
        public starknetContract: StarknetContract,
        public privateKey: string,
        public salt: string,
        protected deployed: boolean
    ) {
        const signer = generateKeys(privateKey);
        this.publicKey = signer.publicKey;
        this.keyPair = signer.keyPair;
    }

    /**
     * Uses the account contract as a proxy to invoke a function on the target contract with a signature
     *
     * @param toContract target contract to be called
     * @param functionName function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: InvokeOptions
    ): Promise<InvokeResponse> {
        if (options?.maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        if (options?.maxFee === undefined || options?.maxFee === null) {
            const maxFee = await this.estimateFee(toContract, functionName, calldata, options);
            options = {
                ...options,
                maxFee: estimatedFeeToMaxFee(maxFee.amount, options?.overhead)
            };
        }
        return (
            await this.interact(InteractChoice.INVOKE, toContract, functionName, calldata, options)
        ).toString();
    }

    get address() {
        return this.starknetContract.address;
    }

    /**
     * Deploy another contract using this account
     * @param contractFactory the factory of the contract to be deployed
     * @param constructorArguments
     * @param options extra options
     * @returns the deployed StarknetContract
     */
    async deploy(
        contractFactory: StarknetContractFactory,
        constructorArguments?: StringMap,
        options: DeployOptions = {}
    ): Promise<StarknetContract> {
        const classHash = await contractFactory.getClassHash();
        const udc = await UDC.getInstance();
        const adaptedArgs = contractFactory.handleConstructorArguments(constructorArguments);
        const deployTxHash = await this.invoke(
            udc,
            UDC_DEPLOY_FUNCTION_NAME,
            {
                classHash,
                salt: options?.salt ?? generateRandomSalt(),
                unique: BigInt(options?.unique ?? true),
                calldata: adaptedArgs
            },
            {
                maxFee: options?.maxFee
            }
        );

        const hre = await import("hardhat");
        const deploymentReceipt = await getTransactionReceiptUtil(deployTxHash, hre);
        const decodedEvents = udc.decodeEvents(deploymentReceipt.events);
        // the only event should be ContractDeployed
        const deployedContractAddress = numericToHexString(decodedEvents[0].data.address);

        const deployedContract = contractFactory.getContractAt(deployedContractAddress);
        deployedContract.deployTxHash = deployTxHash;

        return deployedContract;
    }

    protected assertNotDeployed() {
        if (this.deployed) {
            const msg = "The account is not expected to be deployed.";
            throw new StarknetPluginError(msg);
        }
    }

    private assertDeployed() {
        if (!this.deployed) {
            const msg = "Prior to usage, the account must be funded and deployed.";
            throw new StarknetPluginError(msg);
        }
    }

    async estimateFee(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: EstimateFeeOptions
    ): Promise<starknet.FeeEstimation> {
        return await this.interact(
            InteractChoice.ESTIMATE_FEE,
            toContract,
            functionName,
            calldata,
            options
        );
    }

    async estimateDeclareFee(
        contractFactory: StarknetContractFactory,
        options: EstimateFeeOptions = {}
    ): Promise<starknet.FeeEstimation> {
        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        const maxFee = (options.maxFee || 0).toString();

        const hre = await import("hardhat");
        const classHash = await hre.starknetWrapper.getClassHash(contractFactory.metadataPath);
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const calldata = [classHash];
        const calldataHash = hash.computeHashOnElements(calldata);

        const messageHash = hash.computeHashOnElements([
            TransactionHashPrefix.DECLARE,
            numericToHexString(QUERY_VERSION),
            this.address,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            chainId,
            numericToHexString(nonce)
        ]);

        const signature = this.getSignatures(messageHash);
        const data = {
            type: "DECLARE",
            sender_address: this.address,
            contract_class: readContract(contractFactory.metadataPath),
            signature: bnToDecimalStringArray(signature || []),
            version: numericToHexString(QUERY_VERSION),
            nonce: numericToHexString(nonce)
        };
        return await sendEstimateFeeTx(data);
    }

    async estimateDeployFee(
        contractFactory: StarknetContractFactory,
        constructorArguments?: StringMap,
        options: EstimateFeeOptions = {}
    ): Promise<starknet.FeeEstimation> {
        const classHash = await contractFactory.getClassHash();
        const udc = await UDC.getInstance();
        const adaptedArgs = contractFactory.handleConstructorArguments(constructorArguments);
        const calldata: StringMap = {
            classHash,
            salt: options?.salt ?? generateRandomSalt(),
            unique: BigInt(options?.unique ?? true),
            calldata: adaptedArgs
        };
        return await this.estimateFee(udc, UDC_DEPLOY_FUNCTION_NAME, calldata, options);
    }

    private async interact(
        choice: InteractChoice,
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: InteractOptions
    ) {
        const call: CallParameters = {
            functionName: functionName,
            toContract: toContract,
            calldata: calldata
        };

        return await this.multiInteract(choice, [call], options);
    }

    /**
     * Performes multiple invokes as a single transaction through this account
     * @param callParameters an array with the paramaters for each invoke
     * @returns the transaction hash of the invoke
     */
    async multiInvoke(callParameters: CallParameters[], options?: InvokeOptions): Promise<string> {
        // Invoke only returns one transaction hash, as the multiple invokes are done by the account contract, but only one is sent to it.
        return await this.multiInteract(InteractChoice.INVOKE, callParameters, options);
    }

    /**
     * Etimate the fee of the multicall.
     * @param callParameters an array with the parameters for each call
     * @returns the total estimated fee
     */
    async multiEstimateFee(
        callParameters: CallParameters[],
        options?: EstimateFeeOptions
    ): Promise<starknet.FeeEstimation> {
        return await this.multiInteract(InteractChoice.ESTIMATE_FEE, callParameters, options);
    }

    private async multiInteract(
        choice: InteractChoice,
        callParameters: CallParameters[],
        options: InteractOptions = {}
    ) {
        this.assertDeployed();
        options = copyWithBigint(options);
        options.maxFee = BigInt(options?.maxFee || "0");
        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        delete options.nonce; // the options object is incompatible if passed on with nonce

        const hre = await import("hardhat");
        const { messageHash, args } = this.handleMultiInteract(
            this.address,
            callParameters,
            nonce,
            options.maxFee,
            choice.transactionVersion,
            hre.starknet.networkConfig.starknetChainId
        );

        if (options.signature) {
            const msg =
                "Custom signature cannot be specified when using Account (it is calculated automatically)";
            throw new StarknetPluginError(msg);
        }
        const signatures = this.getSignatures(messageHash);
        const contractInteractOptions = { signature: signatures, ...options };

        const contractInteractor = (<ContractInteractionFunction>(
            this.starknetContract[choice.internalCommand]
        )).bind(this.starknetContract);
        const executionFunctionName = this.getExecutionFunctionName();
        return contractInteractor(executionFunctionName, args, contractInteractOptions);
    }

    /**
     * Prepares the calldata and hashes the message for the multicall execution
     *
     * @param accountAddress address of the account contract
     * @param callParameters array witht the call parameters
     * @param nonce current nonce
     * @param maxFee the maximum fee amount set for the contract interaction
     * @param version the transaction version
     * @returns the message hash for the multicall and the arguments to execute it with
     */
    private handleMultiInteract(
        accountAddress: string,
        callParameters: CallParameters[],
        nonce: Numeric,
        maxFee: Numeric,
        version: Numeric,
        chainId: StarknetChainId
    ) {
        const callArray: Call[] = callParameters.map((callParameters) => {
            return {
                contractAddress: callParameters.toContract.address,
                entrypoint: callParameters.functionName,
                calldata: callParameters.toContract.adaptInput(
                    callParameters.functionName,
                    callParameters.calldata
                )
            };
        });

        const executeCallArray: ExecuteCallParameters[] = [];
        const rawCalldata: RawCalldata = [];

        // Parse the Call array to create the objects which will be accepted by the contract
        callArray.forEach((call) => {
            executeCallArray.push({
                to: BigInt(call.contractAddress),
                selector: hash.starknetKeccak(call.entrypoint),
                data_offset: rawCalldata.length,
                data_len: call.calldata.length
            });
            rawCalldata.push(...call.calldata);
        });

        const adaptedNonce = nonce.toString();
        const adaptedMaxFee = numericToHexString(maxFee);
        const adaptedVersion = numericToHexString(version);
        const messageHash = this.getMessageHash(
            TransactionHashPrefix.INVOKE,
            accountAddress,
            callArray,
            adaptedNonce,
            adaptedMaxFee,
            adaptedVersion,
            chainId
        );

        const args = {
            call_array: executeCallArray,
            calldata: rawCalldata
        };
        return { messageHash, args };
    }

    protected abstract getMessageHash(
        transactionHashPrefix: TransactionHashPrefix,
        accountAddress: string,
        callArray: Call[],
        nonce: string,
        maxFee: string,
        version: string,
        chainId: StarknetChainId
    ): string;

    protected abstract getSignatures(messageHash: string): bigint[];

    protected abstract estimateDeployAccountFee(): Promise<starknet.FeeEstimation>;

    public abstract deployAccount(options?: DeployAccountOptions): Promise<string>;

    protected getExecutionFunctionName() {
        return "__execute__";
    }

    private async getNonce(): Promise<number> {
        const hre = await import("hardhat");
        return await hre.starknet.getNonce(this.address);
    }

    /**
     * Declare the contract class corresponding to the `contractFactory`
     * @param contractFactory
     * @param options
     * @returns the hash of the declared class
     */
    public async declare(
        contractFactory: StarknetContractFactory,
        options: DeclareOptions = {}
    ): Promise<string> {
        let maxFee = options?.maxFee;
        if (maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        if (maxFee === undefined || maxFee === null) {
            const estimatedDeclareFee = await this.estimateDeclareFee(contractFactory, options);
            maxFee = estimatedFeeToMaxFee(estimatedDeclareFee.amount, options?.overhead);
        }

        const hre = await import("hardhat");
        const classHash = await hre.starknetWrapper.getClassHash(contractFactory.metadataPath);
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const calldata = [classHash];
        const calldataHash = hash.computeHashOnElements(calldata);

        const messageHash = hash.computeHashOnElements([
            TransactionHashPrefix.DECLARE,
            TRANSACTION_VERSION.toString(),
            this.address,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee.toString(),
            chainId,
            nonce.toString()
        ]);

        const signature = this.getSignatures(messageHash);
        return contractFactory.declare({
            signature,
            token: options.token,
            sender: this.address,
            maxFee: BigInt(maxFee)
        });
    }
}

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
            this.contractFactory = await hre.starknet.getContractFactory(contractPath);
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
        const hashable: Array<BigNumberish> = [callArray.length];
        const rawCalldata: RawCalldata = [];
        callArray.forEach((call) => {
            hashable.push(
                call.contractAddress,
                hash.starknetKeccak(call.entrypoint),
                rawCalldata.length,
                call.calldata.length
            );
            rawCalldata.push(...call.calldata);
        });

        hashable.push(rawCalldata.length, ...rawCalldata);
        const calldataHash = hash.computeHashOnElements(hashable);
        return hash.computeHashOnElements([
            transactionHashPrefix,
            version,
            accountAddress,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            chainId,
            nonce
        ]);
    }

    protected override getSignatures(messageHash: string): bigint[] {
        return signMultiCall(this.publicKey, this.keyPair, messageHash);
    }

    public override async estimateDeployAccountFee(): Promise<starknet.FeeEstimation> {
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
            0, // entrypoint selector is implied
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
        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        if (BigInt(publicKey) !== expectedPubKey) {
            throw new StarknetPluginError(
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new this(contract, privateKey, undefined, true);
    }
}

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
    public guardianKeyPair: ec.KeyPair;

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
            this.guardianKeyPair = guardianSigner.keyPair;
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
            this.implementationContractFactory = await hre.starknet.getContractFactory(
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
            this.proxyContractFactory = await hre.starknet.getContractFactory(contractPath);
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
            hash.getSelectorFromName("initialize"),
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
        const hashable: Array<BigNumberish> = [callArray.length];
        const rawCalldata: RawCalldata = [];
        callArray.forEach((call) => {
            hashable.push(
                call.contractAddress,
                hash.starknetKeccak(call.entrypoint),
                rawCalldata.length,
                call.calldata.length
            );
            rawCalldata.push(...call.calldata);
        });

        hashable.push(rawCalldata.length, ...rawCalldata);
        const calldataHash = hash.computeHashOnElements(hashable);
        return hash.computeHashOnElements([
            transactionHashPrefix,
            version,
            accountAddress,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            chainId,
            nonce
        ]);
    }

    protected override getSignatures(messageHash: string): bigint[] {
        const signatures = signMultiCall(this.publicKey, this.keyPair, messageHash);
        if (this.guardianPrivateKey) {
            const guardianSignatures = signMultiCall(
                this.guardianPublicKey,
                this.guardianKeyPair,
                messageHash
            );
            signatures.push(...guardianSignatures);
        }
        return signatures;
    }

    public override async estimateDeployAccountFee(): Promise<starknet.FeeEstimation> {
        this.assertNotDeployed();
        const hre = await import("hardhat");

        const nonce = numericToHexString(0);
        const maxFee = numericToHexString(0);

        const constructorCalldata: string[] = [
            ArgentAccount.IMPLEMENTATION_CLASS_HASH,
            hash.getSelectorFromName("initialize"),
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
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            hre.starknet.networkConfig.starknetChainId,
            nonce
        ]);

        const signature = this.getSignatures(msgHash);
        const data = {
            type: "DEPLOY_ACCOUNT",
            class_hash: ArgentAccount.PROXY_CLASS_HASH,
            constructor_calldata: constructorCalldata,
            contract_address_salt: this.salt,
            signature: bnToDecimalStringArray(signature || []),
            version: numericToHexString(QUERY_VERSION),
            nonce
        };

        return await sendEstimateFeeTx(data);
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
            hash.getSelectorFromName("initialize"),
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
        let guardianKeyPair: ec.KeyPair;
        let guardianPublicKey: string;
        if (!BigInt(newGuardianPrivateKey || 0)) {
            newGuardianPrivateKey = undefined;
            guardianPublicKey = undefined;
        } else {
            guardianKeyPair = ellipticCurve.getKeyPair(
                toBN(newGuardianPrivateKey.substring(2), "hex")
            );
            guardianPublicKey = ellipticCurve.getStarkKey(guardianKeyPair);
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
        this.guardianKeyPair = guardianKeyPair;

        return txHash;
    }

    /**
     * Returns an account previously deployed to `address`.
     * A check is performed if the public key stored in the account matches the provided `privateKey`.
     * No check is done for the optoinal guardian private key.
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
        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

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
