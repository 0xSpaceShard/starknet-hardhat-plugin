import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: process.env.STARKNET_DEVNET,
            url: "http://127.0.0.1:5050",
            args: ["--lite-mode", "--gas-price", process.env.EXPECTED_GAS_PRICE, "--seed", "42"]
        }
    }
};
