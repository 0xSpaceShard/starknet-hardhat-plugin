import "../dist/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
