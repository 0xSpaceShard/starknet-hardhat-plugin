import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        scarbCommand: "scarb"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
