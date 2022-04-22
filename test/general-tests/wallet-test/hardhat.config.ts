import "../dist/src/index.js";

module.exports = {
    networks: {
        devnet: {
            url: "http://localhost:5000"
        }
    },
    starknet: {
        network: process.env.NETWORK,
        wallets: {
            OpenZeppelin: {
                accountName: "OpenZeppelin",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "~/.starknet_accounts"
            }
        }
    }
};
