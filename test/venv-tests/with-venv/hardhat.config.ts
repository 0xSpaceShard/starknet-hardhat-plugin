import "../dist/index.js";

module.exports = {
    cairo: {
        venv: "../my-venv"
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
