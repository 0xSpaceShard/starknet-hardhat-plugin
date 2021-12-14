import "../dist/index.js";

module.exports = {
    paths: {
        starknetSources: "my-starknet-sources"
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    },
    mocha: {
        starknetNetwork: process.env.NETWORK
    }
};
