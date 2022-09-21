import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            // using the default runner
            // neither venv nor dockerized version is specified
            url: "http://127.0.0.1:5050",
            args: ["--seed", "42"]
        }
    }
};
