import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "../my-venv",
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
