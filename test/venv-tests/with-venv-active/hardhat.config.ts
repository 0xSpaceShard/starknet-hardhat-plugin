import "../dist/index.js";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
