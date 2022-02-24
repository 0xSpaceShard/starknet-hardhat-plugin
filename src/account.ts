import { Numeric, StarknetContract, StringMap } from "./types";
import { PLUGIN_NAME, OPENZEPPELIN_EXECUTE_FUNCTION } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { hash } from "starknet";
import * as ellipticCurve from "starknet/utils/ellipticCurve";
import { BigNumberish, toBN } from "starknet/utils/number";
import { adaptOutput } from "./adapt";
import * as starknet from "./starknet-types";

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {

    protected constructor(public starknetContract: StarknetContract, public privateKey: string, public publicKey: string, public keyPair: any) {}

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
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        const { args, signature } = await adaptArgs(
            this.keyPair,
            this.starknetContract.address,
            toContract.address,
            functionName,
            calldata,
            nonce
        );
        await this.starknetContract.invoke(OPENZEPPELIN_EXECUTE_FUNCTION, args, { signature });
    }

    async call(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap
    ): Promise<StringMap> {
        const toAddress = toContract.address;
        const abi = toContract.getAbi();
        const { res: nonce } = await this.starknetContract.call("get_nonce");
        const { args, signature } = await adaptArgs(this.keyPair, this.starknetContract.address, toAddress, functionName, calldata, nonce);
        const { response: result } = await this.starknetContract.call(OPENZEPPELIN_EXECUTE_FUNCTION, args, {
            signature
        });
        const func = <starknet.CairoFunction>abi[functionName];
        return adaptOutput(result.join(" "), func.outputs, abi);
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
        console.log("Account private key: " + privateKey);
        console.log("Account public key: " + publicKey);
        console.log("Account address: " + contract.address);

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
     * Adapts the input arguments to the proper format to use in the Account contract proxy invocation function that uses the call_contract syscall
     *
     * @param toAddress address of the contract to be called
     * @param selector function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
async function adaptArgs(keyPair: any, accountAddress: string, toAddress: string, functionName: string, calldata: StringMap, nonce: BigInt) {
        const functionSelector = hash.starknetKeccak(functionName).toString();
        const calldataArray = calldata ? calldataToNumeric(calldata, []) : [];
        const signature = sign(keyPair, accountAddress, nonce.toString(), functionSelector, toAddress, calldataArray);
        const args = {
            to: BigInt(toAddress),
            selector: functionSelector,
            calldata: calldataArray.map((it) => BigInt(it.toString())),
            nonce: nonce.toString()
        };

        return { args, signature };
    }

/**
 * Recursively transforms the input data received as an object to a <BigNumberish> array
 *
 * @param calldata
 * @param output
 * @returns
 */
function calldataToNumeric(calldata: StringMap, output: BigNumberish[]): BigNumberish[] {
    Object.keys(calldata).forEach((key) => {
        if (calldata[key] !== null) {
            if (typeof calldata[key] === "object") {
                output = output.concat(calldataToNumeric(calldata[key], output));
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
function sign(keyPair: any, accountAddress: string, nonce: BigNumberish, functionSelector: BigNumberish, toAddress: string, calldata: BigNumberish[]): Numeric[] {
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
