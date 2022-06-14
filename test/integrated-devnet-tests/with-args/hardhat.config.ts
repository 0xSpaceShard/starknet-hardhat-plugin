import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: "active",
            url: "http://127.0.0.1:5050",
            args: ["--lite-mode", "--lite-mode-block-hash", "--lite-mode-deploy-hash", "--start-time", "10000000"]
        }
    }
};
