import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        requestTimeout: 1
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050",
            stdout: "STDOUT"
        }
    }
};
