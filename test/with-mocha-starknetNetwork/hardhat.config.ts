import "../dist/index.js";
import { ALPHA_URL } from "../dist/constants.js"

module.exports = {
    networks: {
        myNetwork: {
            url: ALPHA_URL
        }
    },
    mocha: {
        starknetNetwork: "myNetwork"
    }
};
