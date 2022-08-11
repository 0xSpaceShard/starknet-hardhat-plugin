import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            venv: process.env.STARKNET_DEVNET_PATH,
            url: "http://127.0.0.1:5050",
            args: ["--accounts", "invalid_value"]
        }
    }
};
