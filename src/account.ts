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
import { TransactionHashPrefix, TRANSACTION_VERSION, UDC_DEPLOY_FUNCTION_NAME } from "./constants";
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
    signMultiCall
} from "./account-utils";
import { numericToHexString, copyWithBigint, generateRandomSalt, UDC } from "./utils";
import { Call, hash, RawCalldata } from "starknet";
import { getTransactionReceiptUtil } from "./extend-utils";
import { StarknetChainId } from "starknet/constants";

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
            const msg = "Both maxFee and overhead cannot be specified";
            throw new StarknetPluginError(msg);
        }

        if (options?.maxFee === undefined || options?.maxFee === null) {
            let overhead =
                options?.overhead === undefined || options?.overhead === null
                    ? 0.5
                    : options?.overhead;
            overhead = Math.round((1 + overhead) * 100);
            const maxFee = await this.estimateFee(toContract, functionName, calldata, options);
            options = {
                ...options,
                maxFee: (maxFee.amount * BigInt(overhead)) / BigInt(100)
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

    public abstract deployAccount(options?: DeployAccountOptions): Promise<string>;

    protected getExecutionFunctionName() {
        return "__execute__";
    }

    private async getNonce(): Promise<number> {
        const hre = await import("hardhat");
        return await hre.starknet.getNonce(this.address);
    }

    /**
     * Whether the execution method of this account returns raw output or not.
     */
    protected abstract hasRawOutput(): boolean;

    public async declare(
        contractFactory: StarknetContractFactory,
        options: DeclareOptions = {}
    ): Promise<string> {
        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        const maxFee = (options.maxFee || 0).toString();

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
            maxFee,
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
        if (!OpenZeppelinAccount.contractFactory) {
            const contractPath = handleInternalContractArtifacts(
                "OpenZeppelinAccount",
                "Account",
                "0.5.1",
                hre
            );
            OpenZeppelinAccount.contractFactory = await hre.starknet.getContractFactory(
                contractPath
            );
        }
        return OpenZeppelinAccount.contractFactory;
    }

    public static async createAccount(
        options: {
            salt?: string;
            privateKey?: string;
        } = {}
    ): Promise<OpenZeppelinAccount> {
        const signer = generateKeys(options.privateKey);
        const salt = options.salt || generateRandomSalt();
        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const address = hash.calculateContractAddressFromHash(
            salt,
            await contractFactory.getClassHash(),
            [signer.publicKey],
            "0x0" // deployer address
        );
        const contract = contractFactory.getContractAt(address);
        return new OpenZeppelinAccount(contract, signer.privateKey, salt, false);
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

    public override async deployAccount(options: DeployAccountOptions = {}): Promise<string> {
        const hre = await import("hardhat");

        const maxFee = numericToHexString(options.maxFee || 0);
        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const classHash = await contractFactory.getClassHash();
        const constructorCalldata = [BigInt(this.publicKey).toString()];

        const msgHash = calculateDeployAccountHash(
            this.address,
            constructorCalldata,
            this.salt,
            classHash,
            maxFee,
            hre.starknet.networkConfig.starknetChainId
        );

        const deploymentTxHash = await sendDeployAccountTx(
            this.getSignatures(msgHash).map((val) => val.toString()),
            classHash,
            constructorCalldata,
            this.salt,
            maxFee
        );

        this.starknetContract.deployTxHash = deploymentTxHash;
        this.deployed = true;
        return deploymentTxHash;
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string
    ): Promise<OpenZeppelinAccount> {
        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const contract = contractFactory.getContractAt(address);

        const { publicKey: expectedPubKey } = await contract.call("getPublicKey");
        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        if (BigInt(publicKey) !== expectedPubKey) {
            throw new StarknetPluginError(
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new OpenZeppelinAccount(contract, privateKey, undefined, true);
    }

    protected override hasRawOutput(): boolean {
        return false;
    }
}

/**
 * Wrapper for the Argent implementation of an Account
 */
export class ArgentAccount extends Account {
    private static contractFactory: StarknetContractFactory;

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

    private static async getContractFactory() {
        const hre = await import("hardhat");
        if (!ArgentAccount.contractFactory) {
            const contractPath = handleInternalContractArtifacts(
                "ArgentAccount",
                "ArgentAccount",
                "780760e4156afe592bb1feff7e769cf279ae9831",
                hre
            );
            ArgentAccount.contractFactory = await hre.starknet.getContractFactory(contractPath);
        }
        return ArgentAccount.contractFactory;
    }

    public static async createAccount(
        options: {
            salt?: string;
            privateKey?: string;
            guardianPrivateKey?: string;
        } = {}
    ): Promise<ArgentAccount> {
        const signer = generateKeys(options.privateKey);
        const salt = options.salt || generateRandomSalt();
        const contractFactory = await ArgentAccount.getContractFactory();
        const address = hash.calculateContractAddressFromHash(
            salt,
            await contractFactory.getClassHash(),
            [], // empty constructor, parameters are passed in initialize
            "0x0" // deployer address
        );
        const contract = contractFactory.getContractAt(address);
        return new ArgentAccount(
            contract,
            signer.privateKey,
            options.guardianPrivateKey,
            salt,
            false
        );
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

    public override async deployAccount(options: DeployAccountOptions = {}): Promise<string> {
        const hre = await import("hardhat");

        const maxFee = numericToHexString(options.maxFee || 0);
        const contractFactory = await ArgentAccount.getContractFactory();
        const classHash = await contractFactory.getClassHash();
        const constructorCalldata: string[] = [];

        const msgHash = calculateDeployAccountHash(
            this.address,
            constructorCalldata,
            this.salt,
            classHash,
            maxFee,
            hre.starknet.networkConfig.starknetChainId
        );

        const deploymentTxHash = await sendDeployAccountTx(
            this.getSignatures(msgHash).map((val) => val.toString()),
            classHash,
            constructorCalldata,
            this.salt,
            maxFee
        );

        this.starknetContract.deployTxHash = deploymentTxHash;
        this.deployed = true;
        return deploymentTxHash;
    }

    /**
     * Updates the guardian key in the contract. Set it to `undefined` to remove the guardian.
     * @param newGuardianPrivateKey private key of the guardian to update
     * @returns hash of the transaction which changes the guardian
     */
    async setGuardian(
        newGuardianPrivateKey: string,
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

    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        options: {
            guardianPrivateKey?: string;
        } = {}
    ): Promise<ArgentAccount> {
        const contractFactory = await ArgentAccount.getContractFactory();
        const contract = contractFactory.getContractAt(address);

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

        return new ArgentAccount(contract, privateKey, options.guardianPrivateKey, undefined, true);
    }

    public async initialize(
        options: {
            maxFee?: Numeric;
        } = {}
    ): Promise<InvokeResponse> {
        return await this.invoke(
            this.starknetContract,
            "initialize",
            {
                signer: this.publicKey,
                guardian: this.guardianPublicKey || "0"
            },
            { maxFee: options.maxFee }
        );
    }

    protected override hasRawOutput(): boolean {
        return true;
    }
}
