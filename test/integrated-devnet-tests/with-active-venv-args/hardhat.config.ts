import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: "active",
            url: "http://127.0.0.1:5050",
            args: ["--lite-mode", "--gas-price", process.env.EXPECTED_GAS_PRICE, "--seed", "42"]
        }
    }
};
