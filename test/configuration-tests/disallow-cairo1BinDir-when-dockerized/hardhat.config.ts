import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        // defaulting to dockerizedVenv

        // supply any path to make it fail in combination with dockerized
        cairo1BinDir: "dummy/path"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
