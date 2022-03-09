import "../dist/index.js";

module.exports = {
    starknet: {
        network: "integrated-devnet"
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: "latest",
            url: "http://127.0.0.1:5000"
        }
    }
};
