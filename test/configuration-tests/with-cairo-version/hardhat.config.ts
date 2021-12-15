import "../dist/index.js";

module.exports = {
    cairo: {
        version: "0.5.1"
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    },
    mocha: {
        starknetNetwork: process.env.NETWORK
    }
};
