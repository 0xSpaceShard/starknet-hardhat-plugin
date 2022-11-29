import shell from "shelljs";
import { assertEqual } from "./utils";

export function exec(cmd: string, expectFailure?: boolean) {
    expectFailure = expectFailure || false;
    const result = shell.exec(cmd, { silent: expectFailure });
    if (!expectFailure) {
        assertEqual(result.code, 0, `Command ${cmd} failed.\n${result.stderr}`);
    }

    return result;
}

export const hardhatStarknetCompile = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-compile ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetDeploy = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-deploy ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetInvoke = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-invoke ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetCall = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-call ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetEstimateFee = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-estimate-fee ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetNewAccount = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-new-account ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetDeployAccount = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-deploy-account ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetRun = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat run ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetTest = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat test ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetVerify = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat starknet-verify ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetMigrate = (args: Array<string>, expectFailure?: boolean) => {
    return exec(`npx hardhat migrate ${args.join(" ")}`, expectFailure);
};

export const hardhatStarknetPluginVersion = () => {
    return exec("npx hardhat starknet-plugin-version");
};
