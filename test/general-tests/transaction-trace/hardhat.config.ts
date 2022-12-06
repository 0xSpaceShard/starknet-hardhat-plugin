import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    solidity: "0.6.12",
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
