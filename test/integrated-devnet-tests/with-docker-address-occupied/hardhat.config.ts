import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: process.env.STARKNET_DEVNET,
            url: "http://127.0.0.1:5050",
            args: ["--seed", "0"]
        }
    }
};
