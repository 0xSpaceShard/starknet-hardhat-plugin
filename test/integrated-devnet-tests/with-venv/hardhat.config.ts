import "../dist/index.js.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: "../my-venv"
        }
    }
};
