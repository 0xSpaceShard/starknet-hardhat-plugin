import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        dockerizedVersion: "0.9.0",
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
