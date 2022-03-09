import "../dist/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORKS
    },
    networks: {
        integratedDevnet: {
            venv: "active"
        }
    }
};
