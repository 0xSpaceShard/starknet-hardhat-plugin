import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK,
        compilerVersion: "1.1.1"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
