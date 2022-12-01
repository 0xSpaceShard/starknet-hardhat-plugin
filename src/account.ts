import {
    CallOptions,
    ContractInteractionFunction,
    DeclareOptions,
    DeployAccountOptions,
    DeployThroughAccountOptions,
    EstimateFeeOptions,
    InteractChoice,
    InteractOptions,
    InvokeOptions,
    InvokeResponse,
    iterativelyCheckStatus,
    Numeric,
    StarknetContract,
    StarknetContractFactory,
    StringMap
} from "./types";
import * as starknet from "./starknet-types";
import { TransactionHashPrefix, TRANSACTION_VERSION, UDC_DEPLOY_FUNCTION_NAME } from "./constants";
import { StarknetPluginError } from "./starknet-plugin-error";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { BigNumberish, toBN } from "starknet/utils/number";
import { ec } from "elliptic";
import {
    CallParameters,
    generateKeys,
    handleInternalContractArtifacts,
    parseMulticallOutput,
    signMultiCall
} from "./account-utils";
import { bigIntToHexString, copyWithBigint, generateRandomSalt, UDC, warn } from "./utils";
import { Call, hash, RawCalldata } from "starknet";
import { getTransactionReceiptUtil } from "./extend-utils";
import axios from "axios";
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
    protected deployed: boolean;

    protected constructor(
        public starknetContract: StarknetContract,
        public privateKey: string,
        public salt: string
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
        return (
            await this.interact(InteractChoice.INVOKE, toContract, functionName, calldata, options)
        ).toString();
    }

    get address() {
        return this.starknetContract.address;
    }

    /**
     * Uses the account contract as a proxy to call a function on the target contract with a signature
     *
     * @param toContract target contract to be called
     * @param functionName function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     * @deprecated This doesn't work with Starknet 0.10 and will be removed in the future; use StarknetContract.call instead
     */
    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options: CallOptions = {}
    ): Promise<StringMap> {
        warn("Using Account.call is deprecated. Use StarknetContract.call instead");
        if (this.hasRawOutput()) {
            options = copyWithBigint(options);
            options.rawOutput = true;
        }

        const { response } = <{ response: string[] }>(
            await this.interact(InteractChoice.CALL, toContract, functionName, calldata, options)
        );

        return toContract.adaptOutput(functionName, response.join(" "));
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
        options?: DeployThroughAccountOptions
    ): Promise<StarknetContract> {
        const classHash = await contractFactory.getClassHash();
        const udc = await UDC.getInstance();
        const adaptedArgs = contractFactory.handleConstructorArguments(constructorArguments);
        const deployTxHash = await this.invoke(udc, UDC_DEPLOY_FUNCTION_NAME, {
            classHash,
            salt: options?.salt ?? generateRandomSalt(),
            unique: BigInt(options?.unique ?? true),
            calldata: adaptedArgs
        });

        const hre = await import("hardhat");
        const deploymentReceipt = await getTransactionReceiptUtil(deployTxHash, hre);
        const decodedEvents = await udc.decodeEvents(deploymentReceipt.events);
        // the only event should be ContractDeployed
        const deployedContractAddress = bigIntToHexString(decodedEvents[0].data.address);

        const deployedContract = contractFactory.getContractAt(deployedContractAddress);
        deployedContract.deployTxHash = deployTxHash;

        return deployedContract;
    }

    private assertDeployed() {
        if (!this.deployed) {
            throw new StarknetPluginError(
                "Prior to usage, the account must be funded and deployed."
            );
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
     * Performs a multicall through this account
     * @param callParameters an array with the paramaters for each call
     * @returns an array with each call's repsecting response object
     * @deprecated not able to sign calls since starknet 0.10
     */
    async multiCall(
        callParameters: CallParameters[],
        options: CallOptions = {}
    ): Promise<StringMap[]> {
        if (this.hasRawOutput()) {
            options = copyWithBigint(options);
            options.rawOutput = true;
        }

        const { response } = <{ response: string[] }>(
            await this.multiInteract(InteractChoice.CALL, callParameters, options)
        );
        const output: StringMap[] = parseMulticallOutput(response, callParameters);
        return output;
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
     * @param maxFee the maximum fee amoutn set for the contract interaction
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
        const adaptedMaxFee = bigIntToHexString(maxFee);
        const adaptedVersion = bigIntToHexString(version);
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
        const chainId = hre.config.starknet.networkConfig.starknetChainId;

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

    private constructor(starknetContract: StarknetContract, privateKey: string, salt: string) {
        super(starknetContract, privateKey, salt);
    }

    private static handleInternalContractArtifacts(hre: HardhatRuntimeEnvironment) {
        return handleInternalContractArtifacts("OpenZeppelinAccount", "Account", "0.5.1", hre);
    }

    private static async getContractFactory() {
        const hre = await import("hardhat");
        if (!OpenZeppelinAccount.contractFactory) {
            const contractPath = OpenZeppelinAccount.handleInternalContractArtifacts(hre);
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
        return new OpenZeppelinAccount(contract, signer.privateKey, salt);
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

    protected getSignatures(messageHash: string): bigint[] {
        return signMultiCall(this.publicKey, this.keyPair, messageHash);
    }

    async deployAccount(
        options: {
            maxFee?: Numeric;
        } = {}
    ) {
        const hre = await import("hardhat");

        const version = bigIntToHexString(TRANSACTION_VERSION);
        const nonce = "0x0";
        const maxFee = bigIntToHexString(options.maxFee || 0); // TODO
        const contractFactory = await OpenZeppelinAccount.getContractFactory();
        const classHash = await contractFactory.getClassHash();
        const constructorCalldata = [BigInt(this.publicKey).toString()];
        const calldataHash = hash.computeHashOnElements([
            classHash,
            this.salt,
            ...constructorCalldata
        ]);
        const msgHash = hash.computeHashOnElements([
            TransactionHashPrefix.DEPLOY_ACCOUNT,
            version,
            this.address,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            hre.config.starknet.networkConfig.starknetChainId,
            nonce
        ]);

        const resp = await axios
            .post(`${hre.starknet.networkUrl}/gateway/add_transaction`, {
                max_fee: maxFee,
                signature: this.getSignatures(msgHash).map((val) => val.toString()),
                nonce,
                class_hash: classHash,
                contract_address_salt: this.salt,
                constructor_calldata: [BigInt(this.publicKey).toString()],
                version,
                type: "DEPLOY_ACCOUNT"
            })
            .catch((error: any) => {
                const msg = `Deploying account failed: ${error.response.data.message}`;
                throw new StarknetPluginError(msg, error);
            });

        this.starknetContract.deployTxHash = resp.data.transaction_hash;
        this.deployed = true;
        return new Promise<string>((resolve, reject) => {
            iterativelyCheckStatus(
                resp.data.transaction_hash,
                hre.starknetWrapper,
                () => resolve(resp.data.transaction_hash),
                reject
            );
        });
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

        const account = new OpenZeppelinAccount(contract, privateKey, undefined);
        account.deployed = true;
        return account;
    }

    protected hasRawOutput(): boolean {
        return false;
    }
}

/**
 * Wrapper for the Argent implementation of an Account
 */
export class ArgentAccount extends Account {
    static readonly ACCOUNT_TYPE_NAME = "ArgentAccount";
    static readonly ACCOUNT_ARTIFACTS_NAME = "ArgentAccount";
    static readonly VERSION = "3e31c25843010149027ca1bdce251b8d63bdfd9c";

    public guardianPublicKey: string;
    public guardianPrivateKey: string;
    public guardianKeyPair: ec.KeyPair;

    private constructor(starknetContract: StarknetContract, privateKey: string, salt: string) {
        super(starknetContract, privateKey, salt);
    }

    // TODO why didn't this report an error when chainId was missing?
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

    protected getSignatures(messageHash: string): bigint[] {
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

    static async deployFromABI(
        hre: HardhatRuntimeEnvironment,
        options: DeployAccountOptions = {}
    ): Promise<ArgentAccount> {
        const contractPath = handleInternalContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            ArgentAccount.VERSION,
            hre
        );

        const signer = generateKeys(options.privateKey);

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy({}, options);

        return new ArgentAccount(contract, signer.privateKey, undefined); // TODO
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<ArgentAccount> {
        const contractPath = handleInternalContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            ArgentAccount.VERSION,
            hre
        );

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = contractFactory.getContractAt(address);

        const { signer: expectedPubKey } = await contract.call("getSigner");
        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        const account = new ArgentAccount(contract, privateKey, undefined);

        if (expectedPubKey === BigInt(0)) {
            // not yet initialized
        } else if (BigInt(publicKey) !== expectedPubKey) {
            throw new StarknetPluginError(
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return account;
    }

    public async initialize(initializeOptions: {
        fundedAccount: Account;
        maxFee?: Numeric;
    }): Promise<void> {
        await initializeOptions.fundedAccount.invoke(
            this.starknetContract,
            "initialize",
            {
                signer: this.publicKey,
                guardian: this.guardianPublicKey || "0"
            },
            { maxFee: initializeOptions.maxFee || 0 }
        );
    }

    protected hasRawOutput(): boolean {
        return true;
    }
}
