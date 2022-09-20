import "../dist/src/index.js";

// defualt in the sense that neither venv nor dockerized devnet is specified

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        integratedDevnet: {
            url: "http://127.0.0.1/5050",
            args: ["--seed", "42"]
        }
    }
};
