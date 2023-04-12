import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK,
        manifestPath: "cairo-compiler/Cargo.toml"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
