import {
    FeeEstimation,
    InteractChoice,
    InvokeResponse,
    parseFeeEstimation,
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
        calldata: StringMap = {}
    ): Promise<InvokeResponse> {
        return (await this.interact("invoke", toContract, functionName, calldata)).toString();
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
        calldata?: StringMap
    ): Promise<StringMap> {
        const { response } = <{ response: string[] }>(
            await this.interact("call", toContract, functionName, calldata)
        );
        return toContract.adaptOutput(functionName, response.join(" "));
    }

    async estimateFee(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<FeeEstimation> {
        const executed = <string>(
            await this.interact("estimate_fee", toContract, functionName, calldata)
        );
        return parseFeeEstimation(executed);
    }

    private async interact(
        choice: InteractChoice,
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ) {
        const call: CallParameters = {
            functionName: functionName,
            toContract: toContract,
            calldata: calldata
        };

        return await this.multiInteract(choice, [call]);
    }

    /**
     * Performs a multicall through this account
     * @param callParameters an array with the paramaters for each call
     * @returns an array with each call's repsecting response object
     */
    async multiCall(callParameters: CallParameters[]): Promise<StringMap[]> {
        const { response } = <{ response: string[] }>(
            await this.multiInteract("call", callParameters)
        );
        const output: StringMap[] = parseMulticallOutput(response, callParameters);
        return output;
    }

    /**
     * Performes multiple invokes as a single transaction through this account
     * @param callParameters an array with the paramaters for each invoke
     * @returns the transaction hash of the invoke
     */
    async multiInvoke(callParameters: CallParameters[]): Promise<string> {
        // Invoke only returns one transaction hash, as the multiple invokes are done by the account contract, but only one is sent to it.
        return (await this.multiInteract("invoke", callParameters)).toString();
    }

    /**
     * Etimate the fee of the multicall.
     * @param callParameters an array with the parameters for each call
     * @returns the total estimated fee
     */
    async multiEstimateFee(callParameters: CallParameters[]): Promise<FeeEstimation> {
        const rawFeeEstimation = await this.multiInteract("estimate_fee", callParameters);
        return parseFeeEstimation(rawFeeEstimation);
    }

    async multiInteract(choice: InteractChoice, callParameters: CallParameters[]) {
        const nonce = await this.getNonce();

        const { messageHash, args } = handleMultiCall(
            this.starknetContract.address,
            callParameters,
            nonce
        );

        const signatures = this.getSignatures(messageHash);
        const options = { signature: signatures };

        const contractInteractor = this.starknetContract[choice];
        const executionFunctionName = this.getExecutionFunctionName();
        return contractInteractor(executionFunctionName, args, options);
    }

    abstract getSignatures(messageHash: string): bigint[];

    abstract getExecutionFunctionName(): string;

    abstract getNonce(): Promise<string>;
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

    static async deployFromABI(hre: HardhatRuntimeEnvironment): Promise<OpenZeppelinAccount> {
        const contractPath = await handleAccountContractArtifacts(
            OpenZeppelinAccount.ACCOUNT_TYPE_NAME,
            OpenZeppelinAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const signer = generateKeys();

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy({ public_key: BigInt(signer.publicKey) });

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

    async getNonce(): Promise<string> {
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        return nonce.toString();
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

    static async deployFromABI(hre: HardhatRuntimeEnvironment): Promise<ArgentAccount> {
        const contractPath = await handleAccountContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const signer = generateKeys();
        const guardian = generateKeys();

        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy();

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

    async getNonce(): Promise<string> {
        const { nonce: nonce } = await this.starknetContract.call("get_nonce");
        return nonce.toString();
    }
}
