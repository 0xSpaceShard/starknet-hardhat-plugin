import "../dist/index.js";

module.exports = {
    cairo: {
        venv: "active"
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
