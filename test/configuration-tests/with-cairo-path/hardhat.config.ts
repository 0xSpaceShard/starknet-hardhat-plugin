import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    starknet: {
        network: process.env.NETWORK
    },
    paths: {
        cairoPaths: ["./new-sources", "~/another-source"]
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
