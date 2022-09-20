import "../dist/src/index.js";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        integratedDevnet: {
            args: ["--seed", "42"]
        }
    }
};
