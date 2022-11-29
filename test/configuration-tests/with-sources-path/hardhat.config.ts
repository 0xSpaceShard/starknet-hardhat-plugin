import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    paths: {
        starknetSources: "my-starknet-sources"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
