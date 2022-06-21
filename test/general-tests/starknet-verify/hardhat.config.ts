import "../dist/src/index.js";

module.exports = {
    starknet: {
        dockerizedVersion: "0.8.1",
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
