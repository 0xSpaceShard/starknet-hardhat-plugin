import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: "devnet"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
