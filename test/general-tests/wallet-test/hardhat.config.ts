import "../dist/src/index.js";

module.exports = {
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        }
    },
    starknet: {
        network: process.env.NETWORK,
        wallets: {
            WalletTest: {
                accountName: "WalletTest",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "./starknet_accounts"
            }
        }
    }
};
