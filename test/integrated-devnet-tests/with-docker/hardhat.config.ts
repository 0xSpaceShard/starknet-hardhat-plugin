import "../dist/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: "latest"
        }
    }
};
