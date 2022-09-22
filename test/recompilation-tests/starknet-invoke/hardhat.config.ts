import "../dist/src/index.js";

module.exports = {
    solidity: "0.6.12",
    starknet: {
        network: process.env.NETWORK,
        recompile: true,
        wallets: {
            RecompileTest: {
                accountName: "RecompileTest",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "./starknet_accounts"
            }
        }
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    }
};
