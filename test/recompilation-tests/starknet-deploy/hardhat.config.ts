import "../dist/src/index.js";

module.exports = {
    solidity: '0.6.12',
    starknet: {
        network: process.env.NETWORK,
        recompile: true
    }
};
