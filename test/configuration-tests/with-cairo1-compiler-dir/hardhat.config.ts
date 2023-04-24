import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK,
        cairo1BinDir: process.env.CAIRO_1_COMPILER_DIR
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
