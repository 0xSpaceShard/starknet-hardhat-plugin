import "../dist/index.js";

module.exports = {
    networks: {
        devnet: {
            url: "http://localhost:5000"
        },
        bar: "http://localhost:1234" // invalid because no url key
    },
    mocha: {
        starknetNetwork: process.env.NETWORK
    }
};
