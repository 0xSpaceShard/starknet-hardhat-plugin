import shell from "shelljs";
import { assertEqual } from "./utils";

export function exec(cmd: string, silent?: boolean) {
    silent = silent || false;
    const result = shell.exec(cmd, { silent: silent });
    assertEqual(result.code, 0, `Command ${cmd} failed.\n${result.stderr}`);

    return result;
}

export const hardhatStarknetCompile = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-compile ${args.join(" ")}`, silent);
};

export const hardhatStarknetDeploy = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-deploy ${args.join(" ")}`, silent);
};

export const hardhatStarknetInvoke = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-invoke ${args.join(" ")}`, silent);
};

export const hardhatStarknetCall = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-call ${args.join(" ")}`, silent);
};

export const hardhatStarknetEstimateFee = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-estimate-fee ${args.join(" ")}`, silent);
};

export const hardhatStarknetNewAccount = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-new-account ${args.join(" ")}`, silent);
};

export const hardhatStarknetDeployAccount = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-deploy-account ${args.join(" ")}`, silent);
};

export const hardhatStarknetRun = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat run ${args.join(" ")}`, silent);
};

export const hardhatStarknetTest = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat test ${args.join(" ")}`, silent);
};

export const hardhatStarknetVerify = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat starknet-verify ${args.join(" ")}`, silent);
};

export const hardhatStarknetMigrate = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat migrate ${args.join(" ")}`, silent);
};

export const hardhatStarknetPluginVersion = () => {
    return exec("npx hardhat starknet-plugin-version");
};
