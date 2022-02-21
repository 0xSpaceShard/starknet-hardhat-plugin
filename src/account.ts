import { Numeric, StarknetContract, StringMap } from "./types";
import starkwareCrypto from "../starkex-resources/crypto/starkware/crypto/signature/signature";
import { PLUGIN_NAME } from "./constants";
import { HardhatPluginError } from "hardhat/plugins";
import { keccak256 } from "ethereum-cryptography/keccak";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const MASK_250 = BigInt(2) ** BigInt(250) - BigInt(1);

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {

    public starknetContract: StarknetContract; // StarknetContract object associated with the Account contract
    public privateKey: string;
    public publicKey: string;
    public keyPair: any;

    constructor(starknetContract: StarknetContract, privateKey: string, publicKey: string, keyPair: any) {
        this.starknetContract=starknetContract;
        this.privateKey=privateKey;
        this.publicKey=publicKey;
        this.keyPair=keyPair;
    }

    /**
     * Deploys an account contract using the ABI as input
     * Must be overriden by child classes
     *
     * @param _accountContract ABI of the account contract
     * @param _hre
     */
    static deployFromABI(_accountContract: string, _hre: HardhatRuntimeEnvironment): Promise<Account> { // eslint-disable-line @typescript-eslint/no-unused-vars
        const msg = "Method not implemented.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    /**
     * Retrieves an already deployed account contract using the ABI, address and private key as input
     * Must be overriden by child classes
     *
     * @param _accountContract ABI of the account contract
     * @param _hre
     */
    static getAccountFromAddress(_accountContract:string, _address: string, _privateKey: string, _hre: HardhatRuntimeEnvironment): Promise<Account> { // eslint-disable-line @typescript-eslint/no-unused-vars
        const msg = "Method not implemented.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    /**
     * Uses the account contract as a proxy to invoke a function on the target contract with a signature
     *
     * @param toAddress address of the contract to be called
     * @param selector function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    abstract invoke(toAddress: string, selector: string, calldata?: StringMap): Promise<void>;

    /**
     * Uses the account contract as a proxy to call a function on the target contract with a signature
     *
     * @param toAddress address of the contract to be called
     * @param selector function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    abstract call(toAddress: string, selector: string, calldata?: StringMap): Promise<StringMap>;

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
    protected calldataToNumeric(calldata: StringMap, output: Numeric[]): Numeric[] {
        Object.keys(calldata).forEach(key => {
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
    protected sign(nonce: any, functionSelector: string, toAddress: string, calldata: Numeric[]): Numeric[] {

        const msgHash = computeHashOnElements([
            this.starknetContract.address.substring(2),
            toAddress.substring(2),
            functionSelector,
            computeHashOnElements(calldata),
            nonce
        ]);

        const signedMessage = starkwareCrypto.sign(this.keyPair, BigInt("0x" + msgHash).toString(16));

        const signature = [
            BigInt("0x" + signedMessage.r.toString(16)),
            BigInt("0x" + signedMessage.s.toString(16))
        ];

        return signature;
    }
}

/**
 * Wrapper for the OpenZeppelin implementation of an Account
 */
export class OpenZeppelinAccount extends Account {

    constructor(starknetContract: StarknetContract, privateKey: string, publicKey: string, keyPair: any) {
        super(starknetContract, privateKey, publicKey, keyPair);
    }

    async invoke(toAddress: string, selector: string, calldata?: StringMap): Promise<void> {
        const { args, signature } = await this.adaptArgs(toAddress, selector, calldata);
        await this.starknetContract.invoke("execute", args, { signature: signature });
    }

    async call(toAddress: string, selector: string, calldata?: StringMap): Promise<StringMap> {
        const { args, signature } = await this.adaptArgs(toAddress, selector, calldata);
        return await this.starknetContract.call("execute", args, { signature });
    }

    async adaptArgs(toAddress: string, selector: string, calldata: StringMap) {

        const { res: nonce } = await this.starknetContract.call("get_nonce");
        const functionSelector = starknetKeccak(selector);
        const calldataArray = calldata ? this.calldataToNumeric(calldata, []): [];
        const signature = this.sign(nonce, functionSelector, toAddress, calldataArray);

        const args = {
            to: BigInt(toAddress),
            selector: BigInt("0x" + functionSelector),
            calldata: calldataArray.map(it => BigInt(it.toString())),
            nonce: nonce
        };

        return { args, signature };
    }

    static async deployFromABI(accountContract: string, hre: HardhatRuntimeEnvironment): Promise<Account> {

        const privateKey = generateRandomStarkPrivateKey();
        const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, "hex");
        const publicKey = starkwareCrypto.ec.keyFromPublic(keyPair.getPublic(true, "hex"), "hex").pub.getX().toString(16);

        const contractFactory = await hre.starknet.getContractFactory(accountContract);
        const contract = await contractFactory.deploy({ _public_key: BigInt("0x" + publicKey) });

        console.log("Account private key: " + privateKey);
        console.log("Account public key: " + publicKey);
        console.log("Account address: " + contract.address);

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
    }

    static async getAccountFromAddress(accountContract:string, address: string, privateKey: string, hre: HardhatRuntimeEnvironment): Promise<Account> {

        const contractFactory = await hre.starknet.getContractFactory(accountContract);
        const contract = contractFactory.getContractAt(address);

        let { res: expectedPubKey } = await contract.call("get_public_key");
        expectedPubKey = expectedPubKey.toString(16);
        const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, "hex");
        const publicKey = starkwareCrypto.ec.keyFromPublic(keyPair.getPublic(true, "hex"), "hex").pub.getX().toString(16);
        if (publicKey !== expectedPubKey) {
            throw new HardhatPluginError(PLUGIN_NAME, "The provided private key is not compatible with the public key stored in the contract.");
        }

        return new OpenZeppelinAccount(contract, privateKey, publicKey, keyPair);
    }
}

/*
 * Helper cryptography functions for Key generation and message signing
 */

function starknetKeccak(value: string): string {
    return (BigInt("0x" + buf2hex(keccak256(new TextEncoder().encode(value)))) & MASK_250).toString(16);
}

function computeHashOnElements(data: Numeric[]): string {
    return [...data, data.length].reduce((x, y) => starkwareCrypto.pedersen([x, y]), 0).toString();
}

function generateRandomStarkPrivateKey() {
    return randomHexString(63);
}

function randomHexString(length: number, leading0x = false) {
    const result = randomString("0123456789ABCDEF", length);
    return leading0x ? "0x" + result : result;
}

function randomString(characters: string, length: number) {
    let result = "";
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function buf2hex(buffer: Uint8Array) {
    return [...buffer].map((x) => x.toString(16).padStart(2, "0")).join("");
}
