import shell from "shelljs";
import { assertEqual, assertNotEqual } from "./utils";

export function exec(cmd: string, expectFailure = false) {
    const result = shell.exec(cmd, { silent: expectFailure });
    const msg = `Command ${cmd} failed.\n${result.stderr}`;
    if (!expectFailure) {
        assertEqual(result.code, 0, msg);
    } else {
        assertNotEqual(result.code, 0, msg);
    }

    return result;
}

export const hardhatStarknetCompile = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat starknet-compile ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetNewAccount = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat starknet-new-account ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetDeployAccount = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat starknet-deploy-account ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetRun = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat run ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetTest = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat test ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetVerify = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat starknet-verify ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetMigrate = (args: Array<string>, expectFailure = false) => {
    return exec(`npx hardhat migrate ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetPluginVersion = () => {
    return exec("npx hardhat starknet-plugin-version");
};
