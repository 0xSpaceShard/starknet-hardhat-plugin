import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
