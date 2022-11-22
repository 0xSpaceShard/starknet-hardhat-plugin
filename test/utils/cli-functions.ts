import shell from "shelljs";

const exec = (cmd: string, silet?: boolean) => {
    silet = silet || false;
    return shell.exec(cmd, { silent: silet });
};

export const hardhatStarknetCompile = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-compile ${args.join(" ")}`, silet);
};

export const hardhatStarknetDeploy = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-deploy ${args.join(" ")}`, silet);
};

export const hardhatStarknetInvoke = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-invoke ${args.join(" ")}`, silet);
};

export const hardhatStarknetCall = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-call ${args.join(" ")}`, silet);
};

export const hardhatStarknetEstimateFee = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-estimate-fee ${args.join(" ")}`, silet);
};

export const hardhatStarknetNewAccount = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-new-account ${args.join(" ")}`, silet);
};

export const hardhatStarknetDeployAccount = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat starknet-deploy-account ${args.join(" ")}`, silet);
};

export const hardhatStarknetRun = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat run ${args.join(" ")}`, silet);
};

export const hardhatStarknetTest = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat test ${args.join(" ")}`, silet);
};

export const hardhatStarknetMigrate = (args: Array<string>, silet?: boolean) => {
    return exec(`npx hardhat migrate ${args.join(" ")}`, silet);
};

export const hardhatStarknetPluginVersion = () => {
    return exec("npx hardhat starknet-plugin-version");
};
