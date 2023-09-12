import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK,
        compilerVersion: process.env.CAIRO_COMPILER
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
