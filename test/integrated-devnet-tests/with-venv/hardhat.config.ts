import "../dist/index.js.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: "../my-venv",
            url: "http://127.0.0.1:5000"
        }
    }
};
