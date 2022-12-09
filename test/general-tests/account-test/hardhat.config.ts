import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            args: ["--seed", "42", "--fork-network", "alpha-goerli"]
        }
    }
};
