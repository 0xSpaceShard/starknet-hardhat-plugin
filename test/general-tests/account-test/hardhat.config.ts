import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            url: "http://127.0.0.1:5050",
            // testing with fork because alpha-goerli has the needed argent account contracts declared
            // using integrated-devnet (in network.json) because spawning devnet is currently out of reach for individual tests
            args: ["--seed", "42", "--fork-network", "alpha-goerli"]
        }
    }
};
