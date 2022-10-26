import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: "active",
            url: "http://127.0.0.1:5050",
            args: ["--lite-mode", "--gas-price", "2000000000", "--seed", "42"]
        }
    }
};
