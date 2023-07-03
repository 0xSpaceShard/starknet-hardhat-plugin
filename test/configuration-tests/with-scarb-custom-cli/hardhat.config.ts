import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK,
        scarbCommand: `${process.env.HOME}/.local/bin/scarb`
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
