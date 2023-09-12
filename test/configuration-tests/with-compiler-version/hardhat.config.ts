import "@shardlabs/starknet-hardhat-plugin";
import { CAIRO_COMPILER } from "../../../config.json";

module.exports = {
    starknet: {
        venv: "active",
        network: process.env.NETWORK,
        compilerVersion: CAIRO_COMPILER
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
