import { Choice, InvokeResponse, StarknetContract, StringMap } from "./types";
import { PLUGIN_NAME } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { hash } from "starknet";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { toBN } from "starknet/utils/number";
import { ec } from "elliptic";
import {
    generateRandomStarkPrivateKey,
    handleAccountContractArtifacts,
    sign
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
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class OpenZeppelinAccount extends Account {
    static readonly EXECUTION_FUNCTION_NAME = "execute";
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
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        const selector = hash.starknetKeccak(functionName);
        const adaptedCalldata = toContract.adaptInput(functionName, calldata);
        const signature = sign(
            this.keyPair,
            this.starknetContract.address,
            nonce.toString(),
            selector.toString(),
            toContract.address,
            adaptedCalldata
        );
        const args = {
            to: BigInt(toContract.address),
            selector,
            calldata: adaptedCalldata,
            nonce
        };

        const options = { signature };
        return this.starknetContract[choice](
            OpenZeppelinAccount.EXECUTION_FUNCTION_NAME,
            args,
            options
        );
    }

    static async deployFromABI(hre: HardhatRuntimeEnvironment): Promise<Account> {
        const contractPath = await handleAccountContractArtifacts(
            OpenZeppelinAccount.ACCOUNT_TYPE_NAME,
            OpenZeppelinAccount.ACCOUNT_ARTIFACTS_NAME,
            hre
        );

        const starkPrivateKey = generateRandomStarkPrivateKey();
        const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
        const publicKey = ellipticCurve.getStarkKey(keyPair);
        const contractFactory = await hre.starknet.getContractFactory(contractPath);
        const contract = await contractFactory.deploy({ _public_key: BigInt(publicKey) });
        const privateKey = "0x" + starkPrivateKey.toString(16);

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
    }

    static async getAccountFromAddress(
        address: string,
        privateKey: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<Account> {
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
}
