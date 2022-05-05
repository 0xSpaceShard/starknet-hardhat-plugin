import {
    CallOptions,
    ContractInteractionFunction,
    DeployAccountOptions,
    EstimateFeeOptions,
    FeeEstimation,
    InteractChoice,
    InteractOptions,
    InvokeOptions,
    InvokeResponse,
    StarknetContract,
    StringMap
} from "./types";
import { PLUGIN_NAME } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { toBN } from "starknet/utils/number";
import { ec } from "elliptic";
import {
    CallParameters,
    generateKeys,
    handleAccountContractArtifacts,
    handleMultiCall,
    parseMulticallOutput,
    signMultiCall
} from "./account-utils";
import { copyWithBigint } from "./utils";

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {
    protected constructor(
        public starknetContract: StarknetContract,
        public privateKey: string,
        public publicKey: string,
        public keyPair: ec.KeyPair
    ) {}

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

    /**
     * Uses the account contract as a proxy to call a function on the target contract with a signature
     *
     * @param toContract target contract to be called
     * @param functionName function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: CallOptions
    ): Promise<StringMap> {
        const { response } = <{ response: string[] }>(
            await this.interact(InteractChoice.CALL, toContract, functionName, calldata, options)
        );
        return toContract.adaptOutput(functionName, response.join(" "));
    }

    async estimateFee(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: EstimateFeeOptions
    ): Promise<FeeEstimation> {
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
     */
    async multiCall(callParameters: CallParameters[], options?: CallOptions): Promise<StringMap[]> {
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
    ): Promise<FeeEstimation> {
        return await this.multiInteract(InteractChoice.ESTIMATE_FEE, callParameters, options);
    }

    private async multiInteract(
        choice: InteractChoice,
        callParameters: CallParameters[],
        options: InteractOptions = {}
    ) {
        options = copyWithBigint(options);
        options.maxFee = BigInt(options?.maxFee || "0");
        const nonce = options.nonce || (await this.getNonce());
        delete options.nonce; // the options object is incompatible if passed on with nonce

        const { messageHash, args } = handleMultiCall(
            this.starknetContract.address,
            callParameters,
            nonce,
            options.maxFee,
            choice.transactionVersion
        );

        const signatures = this.getSignatures(messageHash);
        const contractInteractOptions = { signature: signatures, ...options };

        const contractInteractor = (<ContractInteractionFunction>(
            this.starknetContract[choice.internalCommand]
        )).bind(this.starknetContract);
        const executionFunctionName = this.getExecutionFunctionName();
        return contractInteractor(executionFunctionName, args, contractInteractOptions);
    }

    protected abstract getSignatures(messageHash: string): bigint[];

    protected abstract getExecutionFunctionName(): string;

    protected abstract getNonce(): Promise<bigint>;
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class OpenZeppelinAccount extends Account {
    static readonly ACCOUNT_TYPE_NAME = "OpenZeppelinAccount";
    static readonly ACCOUNT_ARTIFACTS_NAME = "Account";

    constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        publicKey: string,
        keyPair: ec.KeyPair
    ) {
        super(starknetContract, privateKey, publicKey, keyPair);
    }

    getSignatures(messageHash: string): bigint[] {
        return signMultiCall(this.publicKey, this.keyPair, messageHash);
    }

    static async deployFromABI(
        hre: HardhatRuntimeEnvironment,
        options: DeployAccountOptions = {}
    ): Promise<OpenZeppelinAccount> {
        const contractPath = await handleAccountContractArtifacts(
            OpenZeppelinAccount.ACCOUNT_TYPE_NAME,
            OpenZeppelinAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const signer = generateKeys(options.privateKey);

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy(
            { public_key: BigInt(signer.publicKey) },
            options
        );

        return new OpenZeppelinAccount(
            contract,
            signer.privateKey,
            signer.publicKey,
            signer.keyPair
        );
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<OpenZeppelinAccount> {
        const contractPath = await handleAccountContractArtifacts(
            OpenZeppelinAccount.ACCOUNT_TYPE_NAME,
            OpenZeppelinAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = contractFactory.getContractAt(address);

        const { res: expectedPubKey } = await contract.call("get_public_key");

        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        if (BigInt(publicKey) !== expectedPubKey) {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
    }

    getExecutionFunctionName(): string {
        return "__execute__";
    }

    async getNonce(): Promise<bigint> {
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        return nonce;
    }
}

/**
 * Wrapper for the Argent implementation of an Account
 */
export class ArgentAccount extends Account {
    static readonly ACCOUNT_TYPE_NAME = "ArgentAccount";
    static readonly ACCOUNT_ARTIFACTS_NAME = "ArgentAccount";

    public guardianPublicKey: string;
    public guardianPrivateKey: string;
    public guardianKeyPair: ec.KeyPair;

    constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        publicKey: string,
        keyPair: ec.KeyPair,
        guardianPrivateKey: string,
        guardianPublicKey: string,
        guardianKeyPair: ec.KeyPair
    ) {
        super(starknetContract, privateKey, publicKey, keyPair);
        this.guardianPublicKey = guardianPublicKey;
        this.guardianPrivateKey = guardianPrivateKey;
        this.guardianKeyPair = guardianKeyPair;
    }

    getSignatures(messageHash: string): bigint[] {
        const signerSignatures = signMultiCall(this.publicKey, this.keyPair, messageHash);
        const guardianSignatures = signMultiCall(
            this.guardianPublicKey,
            this.guardianKeyPair,
            messageHash
        );
        return signerSignatures.concat(guardianSignatures);
    }

    /**
     * Updates the guardian key in the contract
     * @param newGuardianPrivateKey private key of the guardian to update
     * @returns
     */
    async setGuardian(newGuardianPrivateKey: string): Promise<string> {
        const guardianKeyPair = ellipticCurve.getKeyPair(
            toBN(newGuardianPrivateKey.substring(2), "hex")
        );
        const guardianPublicKey = ellipticCurve.getStarkKey(guardianKeyPair);

        this.guardianPrivateKey = newGuardianPrivateKey;
        this.guardianPublicKey = guardianPublicKey;
        this.guardianKeyPair = guardianKeyPair;

        const call: CallParameters = {
            functionName: "change_guardian",
            toContract: this.starknetContract,
            calldata: { new_guardian: BigInt(guardianPublicKey) }
        };

        return await this.multiInvoke([call]);
    }

    static async deployFromABI(
        hre: HardhatRuntimeEnvironment,
        options: DeployAccountOptions = {}
    ): Promise<ArgentAccount> {
        const contractPath = await handleAccountContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const signer = generateKeys(options.privateKey);
        const guardian = generateKeys();

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy({}, options);

        await contract.invoke("initialize", {
            signer: BigInt(signer.publicKey),
            guardian: BigInt(guardian.publicKey)
        });

        return new ArgentAccount(
            contract,
            signer.privateKey,
            signer.publicKey,
            signer.keyPair,
            guardian.privateKey,
            guardian.publicKey,
            guardian.keyPair
        );
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<ArgentAccount> {
        const contractPath = await handleAccountContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = contractFactory.getContractAt(address);

        const { signer: expectedPubKey } = await contract.call("get_signer");
        const keyPair = ellipticCurve.getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        if (BigInt(publicKey) !== expectedPubKey) {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                "The provided private key is not compatible with the public key stored in the contract."
            );
        }

        return new ArgentAccount(contract, privateKey, publicKey, keyPair, "0", "0", null);
    }

    getExecutionFunctionName(): string {
        return "__execute__";
    }

    async getNonce(): Promise<bigint> {
        const { nonce } = await this.starknetContract.call("get_nonce");
        return nonce;
    }
}
