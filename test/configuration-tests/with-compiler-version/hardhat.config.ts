import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        compilerVersion: process.env.CAIRO_COMPILER
    }
};
