import "../dist/index.js";

module.exports = {
    starknet: {
        network: "hardhat-starknet-devnet"
    },
    networks: {
        hardhatStarknetDevnet: {
            venv: "active",
            url: "http://localhost:5000"
        }
    }
};
