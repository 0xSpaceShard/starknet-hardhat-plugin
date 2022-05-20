import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        recompile: true
    },
    networks: {
        integratedDevnet: {
            venv: "active",
            url: "http://127.0.0.1:5050"
        }
    }
};
