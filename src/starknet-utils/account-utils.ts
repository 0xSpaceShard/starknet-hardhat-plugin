import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { PLUGIN_NAME } from "../constants";
import { AccountImplementationType, DeployAccountOptions } from "../types";
import { Account, ArgentAccount, OpenZeppelinAccount } from "../account";

export async function deployAccount(
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment,
    options?: DeployAccountOptions
): Promise<Account> {
    let account: Account;
    switch (accountType) {
        case "OpenZeppelin":
            account = await OpenZeppelinAccount.deployFromABI(hre, options);
            break;
        case "Argent":
            account = await ArgentAccount.deployFromABI(hre, options);
            break;
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }

    return account;
}

export async function getAccountFromAddress(
    address: string,
    privateKey: string,
    accountType: AccountImplementationType,
    hre: HardhatRuntimeEnvironment
): Promise<Account> {
    let account: Account;
    switch (accountType) {
        case "OpenZeppelin":
            account = await OpenZeppelinAccount.getAccountFromAddress(address, privateKey, hre);
            break;
        case "Argent":
            account = await ArgentAccount.getAccountFromAddress(address, privateKey, hre);
            break;
        default:
            throw new HardhatPluginError(PLUGIN_NAME, "Invalid account type requested.");
    }

    return account;
}
