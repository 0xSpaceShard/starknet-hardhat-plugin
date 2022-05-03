import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    paths: {
        starknetSources: "my-starknet-sources"
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
