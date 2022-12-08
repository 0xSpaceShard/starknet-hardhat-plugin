import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        integratedDevnet: {
            args: ["--seed", "42", "--fork-network", "alpha-goerli"]
        }
    }
};
