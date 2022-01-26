import "../dist/index.js";

module.exports = {
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    },
    mocha: {
        starknetNetwork: process.env.NETWORK
    }
};
