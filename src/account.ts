import { Choice, Numeric, StarknetContract, StringMap } from "./types";
import { PLUGIN_NAME } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { hash } from "starknet";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { BigNumberish, toBN } from "starknet/utils/number";
import { ec } from "elliptic";

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
    ): Promise<void>;

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

    constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        publicKey: string,
        keyPair: ec.KeyPair
    ) {
        super(starknetContract, privateKey, publicKey, keyPair);
    }

    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata: StringMap = {}
    ): Promise<void> {
        await this.invokeOrCall("invoke", toContract, functionName, calldata);
    }

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

    static async deployFromABI(
        accountContract: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<Account> {
        const starkPrivateKey = generateRandomStarkPrivateKey();
        const keyPair = ellipticCurve.getKeyPair(starkPrivateKey);
        const publicKey = ellipticCurve.getStarkKey(keyPair);

        const contractFactory = await hre.starknet.getContractFactory(accountContract);
        const contract = await contractFactory.deploy({ _public_key: BigInt(publicKey) });
        const privateKey = "0x" + starkPrivateKey.toString(16);

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
    }

    static async getAccountFromAddress(
        accountContract: string,
        address: string,
        privateKey: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<Account> {
        const contractFactory = await hre.starknet.getContractFactory(accountContract);
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

/*
 * Helper cryptography functions for Key generation and message signing
 */

function generateRandomStarkPrivateKey(length = 63) {
    const characters = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return toBN(result, "hex");
}

/**
 * Returns a signature which is the result of signing a message
 *
 * @param nonce
 * @param functionSelector
 * @param toAddress
 * @param calldata
 * @returns
 */
function sign(
    keyPair: ec.KeyPair,
    accountAddress: string,
    nonce: BigNumberish,
    functionSelector: string,
    toAddress: string,
    calldata: BigNumberish[]
): Numeric[] {
    const msgHash = hash.computeHashOnElements([
        toBN(accountAddress.substring(2), "hex"),
        toBN(toAddress.substring(2), "hex"),
        functionSelector,
        toBN(hash.computeHashOnElements(calldata).substring(2), "hex"),
        nonce
    ]);

    const signedMessage = ellipticCurve.sign(keyPair, BigInt(msgHash).toString(16));
    const signature = [
        BigInt("0x" + signedMessage[0].toString(16)),
        BigInt("0x" + signedMessage[1].toString(16))
    ];
    return signature;
}
