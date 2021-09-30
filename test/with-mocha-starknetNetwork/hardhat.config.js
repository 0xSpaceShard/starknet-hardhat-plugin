require("../dist/index.js");

module.exports = {
    networks: {
        myNetwork: {
            url: "https://alpha2.starknet.io:443" // TODO change in future
        }
    },
    mocha: {
        starknetNetwork: "myNetwork"
    }
};
