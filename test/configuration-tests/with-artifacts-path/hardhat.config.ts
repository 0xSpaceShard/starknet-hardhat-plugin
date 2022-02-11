import "../dist/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    paths: {
        starknetArtifacts: "my-starknet-artifacts"
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
