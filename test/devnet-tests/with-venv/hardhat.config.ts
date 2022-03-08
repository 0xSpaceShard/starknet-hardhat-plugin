import "../dist/index.js";

module.exports = {
    starknet: {
        network: "hardhat-starknet-devnet"
    },
    networks: {
        hardhatStarknetDevnet: {
            venv: "../my-venv",
            url: "http://localhost:5000"
        }
    }
};
