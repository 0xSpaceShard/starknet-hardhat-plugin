import { Numeric, StarknetContract, StringMap } from "./types";
import { PLUGIN_NAME, RANDOM_KEY_LENGTH } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { hash } from "starknet";
import { sign, getKeyPair, getStarkKey } from "starknet/utils/ellipticCurve";
import { BigNumberish, toBN } from "starknet/utils/number";
import { adaptOutput } from "./adapt";
import * as starknet from "./starknet-types";

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {
    public starknetContract: StarknetContract; // StarknetContract object associated with the Account contract
    public privateKey: string;
    public publicKey: string;
    public keyPair: any;

    protected constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        publicKey: string,
        keyPair: any
    ) {
        this.starknetContract = starknetContract;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.keyPair = keyPair;
    }

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

    /**
     * Adapts the input arguments to the proper format to use in the Account contract proxy invocation function that uses the call_contract syscall
     *
     * @param toAddress address of the contract to be called
     * @param selector function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    abstract adaptArgs(toAddress: string, selector: string, calldata: StringMap): any;

    /**
     * Recursively transforms the input data received as an object to a <Numeric> array
     *
     * @param calldata
     * @param output
     * @returns
     */
    protected calldataToNumeric(calldata: StringMap, output: BigNumberish[]): BigNumberish[] {
        Object.keys(calldata).forEach((key) => {
            if (calldata[key] !== null) {
                if (typeof calldata[key] === "object") {
                    output = output.concat(this.calldataToNumeric(calldata[key], output));
                } else {
                    output.push(calldata[key]);
                }
            }
        });
        return output;
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
    protected sign(
        nonce: any,
        functionSelector: BigNumberish,
        toAddress: string,
        calldata: BigNumberish[]
    ): Numeric[] {
        const msgHash = hash.computeHashOnElements([
            toBN(this.starknetContract.address.substring(2), "hex"),
            toBN(toAddress.substring(2), "hex"),
            functionSelector,
            toBN(hash.computeHashOnElements(calldata).substring(2), "hex"),
            nonce
        ]);

        const signedMessage = sign(this.keyPair, BigInt(msgHash).toString(16));
        const signature = [
            BigInt("0x" + signedMessage[0].toString(16)),
            BigInt("0x" + signedMessage[1].toString(16))
        ];
        return signature;
    }
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class OpenZeppelinAccount extends Account {
    constructor(
        starknetContract: StarknetContract,
        privateKey: string,
        publicKey: string,
        keyPair: any
    ) {
        super(starknetContract, privateKey, publicKey, keyPair);
    }

    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<void> {
        const { args, signature } = await this.adaptArgs(
            toContract.address,
            functionName,
            calldata
        );
        await this.starknetContract.invoke("execute", args, { signature: signature });
    }

    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<StringMap> {
        const toAddress = toContract.address;
        const abi = toContract.getAbi();
        const { args, signature } = await this.adaptArgs(toAddress, functionName, calldata);
        const { response: result } = await this.starknetContract.call("execute", args, {
            signature
        });
        const func = <starknet.CairoFunction>abi[functionName];
        return adaptOutput(result.join(" "), func.outputs, abi);
    }

    async adaptArgs(toAddress: string, functionName: string, calldata: StringMap) {
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        const functionSelector = hash.starknetKeccak(functionName).toString();
        const calldataArray = calldata ? this.calldataToNumeric(calldata, []) : [];
        const signature = this.sign(nonce.toString(), functionSelector, toAddress, calldataArray);
        const args = {
            to: BigInt(toAddress),
            selector: functionSelector,
            calldata: calldataArray.map((it) => BigInt(it.toString())),
            nonce: nonce.toString()
        };

        return { args, signature };
    }

    static async deployFromABI(
        accountContract: string,
        hre: HardhatRuntimeEnvironment
    ): Promise<Account> {
        const privateKey = generateRandomStarkPrivateKey();
        const keyPair = getKeyPair(privateKey);
        const publicKey = getStarkKey(keyPair);

        const contractFactory = await hre.starknet.getContractFactory(accountContract);
        const contract = await contractFactory.deploy({ _public_key: BigInt(publicKey) });

        const pk = "0x" + privateKey.toString(16);
        console.log("Account private key: " + pk);
        console.log("Account public key: " + publicKey);
        console.log("Account address: " + contract.address);

        return new OpenZeppelinAccount(contract, pk, publicKey, keyPair);
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

        const keyPair = getKeyPair(toBN(privateKey.substring(2), "hex"));
        const publicKey = getStarkKey(keyPair);

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

function generateRandomStarkPrivateKey(length = RANDOM_KEY_LENGTH) {
    const characters = "0123456789ABCDEF";
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return toBN(result, "hex");
}
