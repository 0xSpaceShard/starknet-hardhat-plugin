import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Account } from "starknet";

import { PLUGIN_NAME } from "../constants";
import { AccountImplementationType, DeployAccountOptions } from "../types";
import { ArgentAccount, OpenZeppelinAccount } from "../account";

export async function deployAccount(
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment,
    options?: DeployAccountOptions
): Promise<Account> {
    switch (accountType) {
        case "OpenZeppelin":
            return await OpenZeppelinAccount.deployFromABI(hre, options);
        case "Argent":
            return await ArgentAccount.deployFromABI(hre, options);
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }
}

export async function getAccountFromAddress(
    address: string,
    privateKey: string,
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment
): Promise<Account> {
    switch (accountType) {
        case "OpenZeppelin":
            return await OpenZeppelinAccount.getAccountFromAddress(address, privateKey, hre);
        case "Argent":
            return await ArgentAccount.getAccountFromAddress(address, privateKey, hre);
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }
}
