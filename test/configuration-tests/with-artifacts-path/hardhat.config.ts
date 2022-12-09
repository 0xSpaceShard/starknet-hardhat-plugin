import "@shardlabs/starknet-hardhat-plugin";

module.exports = {
    paths: {
        starknetArtifacts: "my-starknet-artifacts"
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
