import { starknet } from "hardhat";
import { StarknetContract } from "./types";
import { readAbi } from "./utils";
import starkwareCrypto from "../starkex-resources/crypto/starkware/crypto/signature/signature";

export class Account {

    private starknetContract: StarknetContract
    private privateKey: string;
    private publicKey: string;
    private keyPair: any;
    constructor(starknetContract: StarknetContract) {
        this.starknetContract=starknetContract;
    }

    public static async deployFromABI(accountContract: string): Promise<Account> {
        const contractFactory = await starknet.getContractFactory(accountContract);
        const privateKey = generateRandomStarkPrivateKey();
        const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
        const publicKey = starkwareCrypto.ec.keyFromPublic(keyPair.getPublic(true, 'hex'), 'hex').pub.getX().toString(16);
        console.log("Account private key: " + privateKey);
        console.log("Account public key: " + publicKey);

        return null
    }

    public static getAccountFromAddress(accountContract:string, address: string, privateKey: string): Account {
        return null;
    }

}

function generateRandomStarkPrivateKey() {
    return randomHexString(63);
}

function randomHexString(length: number, leading0x = false) {
    const result = randomString('0123456789ABCDEF', length);
    return leading0x ? '0x' + result : result;
}

function randomString(characters: string, length: number) {
    let result = '';
    for (let i = 0; i < length; ++i) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
