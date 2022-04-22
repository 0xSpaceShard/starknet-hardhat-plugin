import "../dist/index.js";

module.exports = {
    starknet: {
        dockerizedVersion: process.env.CAIRO_LANG,
        network: process.env.NETWORK
    },
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    }
};
