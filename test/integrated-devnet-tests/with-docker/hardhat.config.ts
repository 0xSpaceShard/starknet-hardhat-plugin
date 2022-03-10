import "../dist/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: "latest",
            url: "http://127.0.0.1:5000"
        }
    }
};
