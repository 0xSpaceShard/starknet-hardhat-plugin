import { Choice, InvokeResponse, StarknetContract, StringMap } from "./types";
import { PLUGIN_NAME } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { hash } from "starknet";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { toBN } from "starknet/utils/number";
import { ec } from "elliptic";
import {
    CallParameters,
    generateRandomStarkPrivateKey,
    handleAccountContractArtifacts,
    handleMultiCall,
    sign,
    signMultiCall
} from "./account-utils";
import { flattenStringMap } from "./utils";

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
    abstract invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<InvokeResponse>;

    /**
     * Uses the account contract as a proxy to call a function on the target contract with a signature
     *
     * @param toContract target contract to be called
     * @param functionName function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    abstract call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<StringMap>;

    abstract multiCall(callParameters: CallParameters[]): Promise<StringMap>;

    abstract multiInvoke(callParameters: CallParameters[]): Promise<InvokeResponse>;
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class OpenZeppelinAccount extends Account {
    static readonly EXECUTION_FUNCTION_NAME = "__execute__";
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

    /**
     * Invoke a function of a contract through this account.
     * @param toContract the contract being being invoked
     * @param functionName the name of the function to invoke
     * @param calldata the calldata to be passed to the function
     */
    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata: StringMap = {}
    ): Promise<InvokeResponse> {
        return (await this.invokeOrCall("invoke", toContract, functionName, calldata)).toString();
    }

    /**
     * Call a function of a contract through this account.
     * @param toContract the contract being being called
     * @param functionName the name of the function to call
     * @param calldata the calldata to be passed to the function
     */
    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<StringMap> {
        const { response } = <{ response: string[] }>(
            await this.invokeOrCall("call", toContract, functionName, calldata)
        );
        return toContract.adaptOutput(functionName, response.join(" "));
    }

    private async invokeOrCall(
        choice: Choice,
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ) {
        const callArray: CallParameters = {
            functionName: functionName,
            toContract: toContract,
            calldata: calldata
        };

        return await this.multiInvokeOrMultiCall(choice, [callArray]);
    }

    static async deployFromABI(hre: HardhatRuntimeEnvironment): Promise<OpenZeppelinAccount> {
        const contractPath = await handleAccountContractArtifacts(
            OpenZeppelinAccount.ACCOUNT_TYPE_NAME,
            OpenZeppelinAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const starkPrivateKey = generateRandomStarkPrivateKey();
        const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
        const publicKey = ellipticCurve.getStarkKey(keyPair);
        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy({ public_key: BigInt(publicKey) });
        const privateKey = "0x" + starkPrivateKey.toString(16);

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
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

    /**
     * Performs a multicall through this account
     * @param callParameters an array with the paramaters for each call
     * @returns an array with each call's repsecting response object
     */
    async multiCall(callParameters: CallParameters[]): Promise<StringMap[]> {
        const { response } = <{ response: string[] }>(
            await this.multiInvokeOrMultiCall("call", callParameters)
        );

        const output: StringMap[] = [];
        let tempResponse = response;

        callParameters.forEach((call) => {
            const parsedOutput = call.toContract.adaptOutput(
                call.functionName,
                tempResponse.join(" ")
            );
            const flattenedOutput = flattenStringMap(parsedOutput);
            tempResponse.splice(0, flattenedOutput.length);
            output.push(parsedOutput);
        });

        return output;
    }

    /**
     * Performes multiple invokes as a single transaction through this account
     * @param callParameters an array with the paramaters for each invoke
     * @returns the transaction hash of the invoke
     */
    async multiInvoke(callParameters: CallParameters[]): Promise<string> {
        // Invoke only returns one transaction hash, as the multiple invokes are done by the account contract, but only one is sent to it.
        return (await this.multiInvokeOrMultiCall("invoke", callParameters)).toString();
    }

    private async multiInvokeOrMultiCall(choice: Choice, callParameters: CallParameters[]) {
        const { res: nonce } = await this.starknetContract.call("get_nonce");

        const { messageHash, args } = handleMultiCall(
            this.starknetContract.address,
            callParameters,
            nonce
        );

        const signatures = signMultiCall(this.publicKey, this.keyPair, messageHash);

        const options = { signature: signatures };

        return await this.starknetContract[choice](
            OpenZeppelinAccount.EXECUTION_FUNCTION_NAME,
            args,
            options
        );
    }
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class ArgentAccount extends Account {
    static readonly EXECUTION_FUNCTION_NAME = "__execute__";
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

    /**
     * Invoke a function of a contract through this account.
     * @param toContract the contract being being invoked
     * @param functionName the name of the function to invoke
     * @param calldata the calldata to be passed to the function
     */
    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata: StringMap = {}
    ): Promise<InvokeResponse> {
        return (await this.invokeOrCall("invoke", toContract, functionName, calldata)).toString();
    }

    /**
     * Call a function of a contract through this account.
     * @param toContract the contract being being called
     * @param functionName the name of the function to call
     * @param calldata the calldata to be passed to the function
     */
    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<StringMap> {
        const { response } = <{ response: string[] }>(
            await this.invokeOrCall("call", toContract, functionName, calldata)
        );
        return toContract.adaptOutput(functionName, response.join(" "));
    }

    private async invokeOrCall(
        choice: Choice,
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ) {
        const callArray: CallParameters = {
            functionName: functionName,
            toContract: toContract,
            calldata: calldata
        };

        return await this.multiInvokeOrMultiCall(choice, [callArray]);
    }

    /**
     * Performs a multicall through this account
     * @param callParameters an array with the paramaters for each call
     * @returns an array with each call's repsecting response object
     */
    async multiCall(callParameters: CallParameters[]): Promise<StringMap[]> {
        const { response } = <{ response: string[] }>(
            await this.multiInvokeOrMultiCall("call", callParameters)
        );

        const output: StringMap[] = [];
        let tempResponse = response;

        callParameters.forEach((call) => {
            const parsedOutput = call.toContract.adaptOutput(
                call.functionName,
                tempResponse.join(" ")
            );
            const flattenedOutput = flattenStringMap(parsedOutput);
            tempResponse.splice(0, flattenedOutput.length);
            output.push(parsedOutput);
        });

        return output;
    }

    /**
     * Performes multiple invokes as a single transaction through this account
     * @param callParameters an array with the paramaters for each invoke
     * @returns the transaction hash of the invoke
     */
    async multiInvoke(callParameters: CallParameters[]): Promise<string> {
        // Invoke only returns one transaction hash, as the multiple invokes are done by the account contract, but only one is sent to it.
        return (await this.multiInvokeOrMultiCall("invoke", callParameters)).toString();
    }

    private async multiInvokeOrMultiCall(choice: Choice, callParameters: CallParameters[]) {
        const { nonce: nonce } = await this.starknetContract.call("get_nonce");

        const { messageHash, args } = handleMultiCall(
            this.starknetContract.address,
            callParameters,
            nonce
        );

        const signerSignatures = signMultiCall(this.publicKey, this.keyPair, messageHash);

        const guardianSignatures = signMultiCall(
            this.guardianPublicKey,
            this.guardianKeyPair,
            messageHash
        );

        const signatures = signerSignatures.concat(guardianSignatures);

        const options = { signature: signatures };

        return await this.starknetContract[choice](
            ArgentAccount.EXECUTION_FUNCTION_NAME,
            args,
            options
        );
    }

    async setGuardian(newGuardianPrivateKey: string): Promise<string> {
        const guardianKeyPair = ellipticCurve.getKeyPair(toBN(newGuardianPrivateKey, "hex"));
        const guardianPublicKey = ellipticCurve.getStarkKey(guardianKeyPair);

        this.guardianPrivateKey = newGuardianPrivateKey;
        this.guardianPublicKey = guardianPublicKey;
        this.guardianKeyPair = guardianKeyPair;

        return await this.starknetContract.invoke("change_guardian", {
            new_guardian: guardianPublicKey
        });
    }

    static async deployFromABI(hre: HardhatRuntimeEnvironment): Promise<ArgentAccount> {
        const contractPath = await handleAccountContractArtifacts(
            ArgentAccount.ACCOUNT_TYPE_NAME,
            ArgentAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const starkPrivateKey = generateRandomStarkPrivateKey();
        const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
        const publicKey = ellipticCurve.getStarkKey(keyPair);
        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy();
        const privateKey = "0x" + starkPrivateKey.toString(16);

        const guardianStarkPrivateKey = generateRandomStarkPrivateKey();
        const guardianKeyPair = ellipticCurve.getKeyPair(guardianStarkPrivateKey);
        const guardianPublicKey = ellipticCurve.getStarkKey(guardianKeyPair);
        const guardianPrivateKey = "0x" + guardianStarkPrivateKey.toString(16);

        await contract.invoke("initialize", {
            signer: BigInt(publicKey),
            guardian: BigInt(guardianPublicKey)
        });
        return new ArgentAccount(
            contract,
            privateKey,
            publicKey,
            keyPair,
            guardianPrivateKey,
            guardianPublicKey,
            guardianKeyPair
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
}
