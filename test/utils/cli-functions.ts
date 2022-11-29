import shell from "shelljs";

const exec = (cmd: string, silent?: boolean) => {
    silent = silent || false;
    return shell.exec(cmd, { silent: silent });
};

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

export const hardhatStarknetMigrate = (args: Array<string>, silent?: boolean) => {
    return exec(`npx hardhat migrate ${args.join(" ")}`, silent);
};

export const hardhatStarknetPluginVersion = () => {
    return exec("npx hardhat starknet-plugin-version");
};
