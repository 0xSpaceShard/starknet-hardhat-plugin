import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        // defaulting to dockerizedVenv
        cairo1BinDir: "dummy/path"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
