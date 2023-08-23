import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        cairo1BinDir: process.env.CAIRO_1_COMPILER_DIR,
        network: "alphaGoerli2"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
