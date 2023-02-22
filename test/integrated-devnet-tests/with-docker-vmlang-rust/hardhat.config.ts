import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    networks: {
        integratedDevnet: {
            dockerizedVersion: process.env.STARKNET_DEVNET,
            vmLang: "rust",
            url: "http://127.0.0.1:5050",
            args: ["--seed", "42"],
            stderr: "STDERR"
        }
    }
};
