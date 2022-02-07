import "../dist/index.js";

module.exports = {
    starknet: {
        venv: "../my-venv",
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
