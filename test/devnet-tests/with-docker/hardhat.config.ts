import "../dist/index.js";

module.exports = {
    starknet: {
        network: "hardhat-starknet-devnet"
    },
    networks: {
        hardhatStarknetDevnet: {
            dockerizedVersion: "latest",
            url: "http://localhost:5000"
        }
    }
};
