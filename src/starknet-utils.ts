import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Provider } from "starknet";

import { DevnetUtils } from "./devnet-utils";
import {
    bigIntToShortStringUtil,
    deployAccountUtil,
    getAccountFromAddressUtil,
    getContractFactoryUtil,
    shortStringToBigIntUtil
} from "./extend-utils";
import { AccountImplementationType, DeployAccountOptions } from "./types";

export class StarknetUtils {
    public readonly devnet: DevnetUtils;
    public readonly provider: Provider;

    constructor(private hre: HardhatRuntimeEnvironment) {
        this.devnet = new DevnetUtils(hre);
    }

    /**
     * Fetches a compiled contract by name. E.g. if the contract is defined in MyContract.cairo,
     * the provided string should be `MyContract`.
     * @param name the case-sensitive contract name
     * @returns a factory for generating instances of the desired contract
     */
    async getContractFactory(contractPath: string) {
        const contractFactory = await getContractFactoryUtil(this.hre, contractPath);
        return contractFactory;
    }

    /**
     * Cairo and Starknet source files may contain short string literals,
     * which are interpreted as numbers (felts) during Starknet runtime.
     * Use this utility function to provide short string arguments to your contract functions.
     *
     * This function converts such a short string (max 31 characters) to its felt representation (wrapped in a `BigInt`).
     * Only accepts standard ASCII characters, i.e. characters with charcode between 0 and 127, inclusive.
     * @param input the input short string
     * @returns the numeric equivalent of the input short string, wrapped in a `BigInt`
     */
    shortStringToBigInt(convertableString: string) {
        const convertedString = shortStringToBigIntUtil(convertableString);
        return convertedString;
    }

    /**
     * Converts a BigInt to a string. The opposite of {@link shortStringToBigInt}.
     * @param input the input BigInt
     * @returns a string which is the result of converting a BigInt's hex value to its ASCII equivalent
     */
    bigIntToShortString(convertableBigInt: BigInt) {
        const convertedBigInt = bigIntToShortStringUtil(convertableBigInt);
        return convertedBigInt;
    }

    /**
     * Deploys an Account contract based on the ABI and the type of Account selected
     * @param accountType the enumerator value of the type of Account to use
     * @param options optional deployment options
     * @returns an Account object
     */
    async deployAccount(accountType: AccountImplementationType, options: DeployAccountOptions) {
        const account = await deployAccountUtil(accountType, this.hre, options);
        return account;
    }

    /**
     * Returns an Account already deployed based on the address and validated by the private key
     * @param address the address where the account is deployed
     * @param privateKey the private key of the account
     * @param accountType the enumerator value of the type of Account to use
     * @returns an Account object
     */
    async getAccountFromAddress(
        address: string,
        privateKey: string,
        accountType: AccountImplementationType
    ) {
        const account = await getAccountFromAddressUtil(address, privateKey, accountType, this.hre);
        return account;
    }
}
