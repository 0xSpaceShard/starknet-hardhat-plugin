[![npm package](https://img.shields.io/npm/v/@shardlabs/starknet-hardhat-plugin?color=blue)](https://www.npmjs.com/package/@shardlabs/starknet-hardhat-plugin)

If you've used Hardhat 👷‍♀️👷‍♂️ and want to develop for Starknet <img src="https://starkware.co/wp-content/uploads/2021/07/Group-177.svg" alt="starknet" width="18"/>, this plugin might come in hand. If you've never set up a Hardhat project, check out [this guide](https://hardhat.org/tutorial/creating-a-new-hardhat-project.html).

## Contents
- [Install](#install)
- [CLI commands](#cli-commands)
- [API](#api)
- [Testing](#test)
  - [Important notes](#important-notes)
  - [Examples](#test-examples)
- [Configure the plugin](#configure-the-plugin)
- [More examples](#more-examples)

## Install
```
npm install @shardlabs/starknet-hardhat-plugin --save-dev
```
Add the following line to the top of your `hardhat.config.ts` (or `hardhat.config.js`):
```typescript
import "@shardlabs/starknet-hardhat-plugin";
// or
require("@shardlabs/starknet-hardhat-plugin");
```

### Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8 (optional):
  - Since plugin version 0.3.4, Docker is no longer necessary if you opt for a Python environment (more info in [Config](#cairo-version)).
  - If you opt for the containerized version, make sure you have a running Docker daemon.
  - If you're experiencing Docker access issues, check [this](https://stackoverflow.com/questions/52364905/after-executing-following-code-of-dockerode-npm-getting-error-connect-eacces-v).
- Linux / macOS:
  - On Windows, we recommend using WSL 2.

## CLI commands
This plugin adds the following tasks which target the source/artifact/test directories of your Hardhat project:
### `starknet-compile`
```
npx hardhat starknet-compile [PATH...] [--cairo-path "<LIB_PATH1>:<LIB_PATH2>:..."]
```
If no paths are provided, all Starknet contracts in the default contracts directory are compiled. Paths can be files and directories.

`--cairo-path` allows specifying the locations of imported files, if necessary. Separate them with a colon (:), e.g. `--cairo-path='path/to/lib1:path/to/lib2'`

### `starknet-deploy`
```
npx hardhat starknet-deploy [--starknet-network <NAME>] [--wait] [--gateway-url <URL>] [ARTIFACT_PATH...] [--inputs <CONSTRUCTOR_ARGUMENTS>] [--salt <SALT>]
```
If no paths are provided, all Starknet artifacts from the default artifacts directory are deployed. Paths can be files and directories.

If you're passing constructor arguments, pass them space separated, but as a single string (due to limitations of the plugin system).

If the "--wait" flag is passed, the task will wait until the transaction status of the deployment is "PENDING" before ending.

The "--salt" parameter should be an hex string which, when provided, will add a salt to the contract address.

Notice that this plugin relies on `--starknet-network` (or `STARKNET_NETWORK` environment variable) and not on Hardhat's `--network`. So if you define
```javascript
module.exports = {
  networks: {
    myNetwork: {
      url: "http://localhost:5000"
    }
  }
}
```
you can use it by calling `npx hardhat starknet-deploy --starknet-network myNetwork`.

The Alpha networks are available by default, you don't need to define them in the config file; just pass:
- `--starknet-network alpha` or `--starknet-network alpha-goerli` for Alpha Testnet (on Goerli)
- `--starknet-network alpha-mainnet` for Alpha Mainnet

```
npx hardhat starknet-deploy starknet-artifacts/contract.cairo/ --inputs "1 2 3"
```
You would typically use the input feature when deploying a single contract requiring constructor arguments. If you are deploying multiple contracts, they'll all use the same input.

### `starknet-verify`
```
npx hardhat starknet-verify [--starknet-network <NAME>] [--path <PATH>] [--address <CONTRACT_ADDRESS>]
```

Queries [Voyager](https://voyager.online/) to [verify the contract](https://voyager.online/verifyContract) deployed at `<CONTRACT_ADDRESS>` using the source file at `<PATH>`.

Like in the previous command, this plugin relies on `--starknet-network`, but will default to 'alpha' network in case this parameter is not passed.

### `starknet-deploy-account`
```
npx hardhat starknet-deploy-account [--starknet-network <NAME>] [--wallet <WALLET_NAME>]
```

Deploys the wallet `wallets["WALLET_NAME"]` configured in the `hardhat.config` file

```
npx hardhat starknet-deploy-account --starknet-network myNetwork --wallet MyWallet
```

### `starknet-invoke`
```
npx hardhat starknet-invoke [--starknet-network <NAME>] [--gateway-url <URL>] [--contract <CONTRACT_NAME>] [--address <CONTRACT_ADDRESS>] [--function <FUNCTION_NAME>] [--inputs <FUNCTION_INPUTS>] [--signature <INVOKE_SIGNATURE>] [--wallet <WALLET_NAME>]
```

Invokes a function on the target contract.
If the function takes any inputs, they should be passed as a single string, separated by space.
If the wallet argument is passed, the wallet `wallets["WALLET_NAME"]` configured in the `hardhat.config` file will be used. If omitted, the Starknet argument `--no_wallet` will be used by default.
```
npx hardhat starknet-invoke --starknet-network myNetwork --contract contract --function increase_balance --address $CONTRACT_ADDRESS --inputs "10 20" --wallet MyWallet
```

### `starknet-call`
```
npx hardhat starknet-call [--starknet-network <NAME>] [--gateway-url <URL>] [--contract <CONTRACT_NAME>] [--address <CONTRACT_ADDRESS>] [--function <FUNCTION_NAME>] [--inputs <FUNCTION_INPUTS>] [--signature <INVOKE_SIGNATURE>] [--wallet <WALLET_NAME>] [--blockNumber <BLOCK_NUMBER>]
```

Calls a function on the target contract and returns its return value.
If the function takes any inputs, they should be passed as a single string, separated by space.
The pending block will always be queried by default, and if there's no pending block, the default behaviour is to query the last block. Using the `--blockNumber` argument will query the specified block.
If the wallet argument is passed, the wallet `wallets["WALLET_NAME"]` configured in the `hardhat.config` file will be used. If omitted, the Starknet argument `--no_wallet` will be used by default.
```
npx hardhat starknet-call --starknet-network myNetwork --contract contract --function sum_points_to_tuple --address $CONTRACT_ADDRESS --inputs "10 20 30 40"
```

## API
Adding this plugin to your project expands Hardhat's runtime with a `starknet` object. It can be imported with:
```typescript
import { starknet } from "hardhat";
// or
const starknet = require("hardhat").starknet;
```
To see all the utilities this object introduces, check [this](src/type-extensions.ts#L85) out.

## Testing
Relying on the above described API makes it easier to interact with your contracts and test them.

To test Starknet contracts with Mocha, use the regular Hardhat `test` task which expects test files in your designated test directory:
```
npx hardhat test
```

Read more about the network used in tests in the [Testing network](#testing-network) section.
These examples are inspired by the official [Starknet Python tutorial](https://www.cairo-lang.org/docs/hello_starknet/unit_tests.html).

### Important notes
- `BigInt` is used because `felt` may be too big for javascript. Use it like `BigInt("10")` or, since ES2020, like `10n`.
- All function names, argument names and return value names should be referred to by the names specified in contract source files.
- The argument of `getContractFactory` is the **name** or the **path** of the source of the target contract:
  - if providing a path, it should be relative to the project root or the contracts directory:
    - `getContractFactory("contracts/subdir/MyContract.cairo")`
    - `getContractFactory("subdir/MyContract.cairo")`
  - the extension can be omitted:
    - `getContractFactory("subdir/MyContract")`
    - `getContractFactory("MyContract")`
- The `wallet` is an optional argument for the `StarknetContract` `invoke` and `call` methods, and if omitted, the Starknet argument `--no_wallet` will be passed by default.
- To get the wallet configured in the `hardhat.config` file, simply use `starknet.getWallet("MyWallet")`.


### Test examples
```typescript
import { expect } from "chai";
import { starknet } from "hardhat";
// or
const expect = require("chai").expect;
const starknet = require("hardhat").starknet;

describe("My Test", function () {
  this.timeout(300_000); // 5 min - recommended if used with Alpha testnet
  // this.timeout(30_000); // 30 seconds - recommended if used with starknet-devnet

  /**
   * Assumes there is a file MyContract.cairo whose compilation artifacts have been generated.
   * The contract is assumed to have:
   * - constructor function constructor(initial_balance: felt)
   * - external function increase_balance(amount: felt) -> (res: felt)
   * - view function get_balance() -> (res: felt)
   */ 
  it("should work for a fresh deployment", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy({ initial_balance: 10 });
    console.log("Deployed at", contract.address);

    await contract.invoke("increase_balance", { amount: 10 }); // invoke method by name and pass arguments by name
    await contract.invoke("increase_balance", { amount: BigInt("20") });

    const { res } = await contract.call("get_balance"); // call method by name and receive the result by name
    expect(res).to.deep.equal(BigInt(40)); // you can also use 40n instead of BigInt(40)
  });

  it("should work for a previously deployed contract", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = contractFactory.getContractAt("0x123..."); // you might wanna put an actual address here
    await contract.invoke(...);
  });

  /**
   * Assumes there is a file MyContract.cairo whose compilation artifacts have been generated.
   * The contract is assumed to have:
   * - view function sum_array(a_len: felt, a: felt*) -> (res: felt)
   */
  it("should work with arrays", async function() {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy(); // no constructor -> no constructor arguments
    const { res } = await contract.call("sum_array", { a: [1, 2, 3] });
    expect(res).to.deep.equal(BigInt(6));
  });

  /**
   * Assumes there is a file MyContract.cairo whose compilation artifacts have been generated.
   * The contract is assumed to have:
   * - view function sum_pair(pair: (felt, felt)) -> (res: felt)
   */
  it("should work with tuples", async function() {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy();
    // notice how the pair tuple is passed as javascript array
    const { res } = await contract.call("sum_pair", { pair: [10, 20] });
    expect(res).to.deep.equal(BigInt(30));
  });

  /**
   * Assumes there is a file MyContract.cairo, and the OpenZeppelin Account.cairo file and its dependencies, whose compilation artifacts have been generated.
   * The contract is assumed to have:
   * - external function increase_balance(amount1: felt, amount2: felt) -> ()
   * - view function get_balance() -> (res: felt)
   */
  it("should succeed when using the account to invoke a function on another contract", async function() {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy()

    const account = await starknet.deployAccountFromABI("Account", "OpenZeppelin");
    const accountAddress = account.starknetContract.address;
    const privateKey = account.privateKey;
    const publicKey = account.publicKey;

    const { res: currBalance } = await account.call(contract, "get_balance");
    const amount1 = 10n;
    const amount2 = 20n;
    await account.invoke(contract, "increase_balance", { amount1, amount2 });

    const { res: newBalance } = await account.call(contract, "get_balance");
    expect(newBalance).to.deep.equal(currBalance + amount1 + amount2);
  });
});
```

For more usage examples, including tuple, array and struct support, as well as wallet support, check [sample-test.ts](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/sample-test.ts) of [starknet-hardhat-example](https://github.com/Shard-Labs/starknet-hardhat-example).

## Configure the plugin
Specify custom configuration by editing your project's `hardhat.config.ts` (or `hardhat.config.js`).

### Cairo version
Use this configuration option to select the `cairo-lang`/`starknet` version used by the underlying Docker container. If you specify neither `dockerizedVersion` nor [venv](#existing-virtual-environment), the latest dockerized version is used.

A list of available versions can be found [here](https://hub.docker.com/r/shardlabs/cairo-cli/tags).
```javascript
module.exports = {
  starknet: {
    // The default in this version of the plugin
    dockerizedVersion: "0.7.1"
  }
  ...
};
```

### Existing virtual environment
If you want to use an existing Python virtual environment, specify it by using `starknet["venv"]`.

To use the currently activated environment (or if you have the starknet commands globally installed), set `venv` to `"active"`.
```typescript
module.exports = {
  starknet: {
    // venv: "active" <- for the active virtual environment
    // venv: "path/to/my-venv" <- for env created with e.g. `python -m venv path/to/my-venv`
    venv: "<VENV_PATH>"
  }
}
```

### Paths
```typescript
module.exports = {
  paths: {
    // Defaults to "contracts" (the same as `paths.sources`).
    starknetSources: "my-own-starknet-path",

    // Defaults to "starknet-artifacts".
    // Has to be different from the value set in `paths.artifacts` (which is used by core Hardhat and has a default value of `artifacts`).
    starknetArtifacts: "also-my-own-starknet-path",

   // Same purpose as the `--cairo-path` argument of the `starknet-compile` command
   // Allows specifying the locations of imported files, if necessary.
    cairoPaths: ["my/own/cairo-path1", "also/my/own/cairo-path2"]
  }
  ...
};
```

### Testing network
To set the network used in your Mocha tests, use `starknet["network"]`. Not specifying one will default to using Alpha testnet.

A faster approach is to use [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet), a Ganache-like local testnet.

```javascript
module.exports = {
  starknet: {
    network: "myNetwork"
  },
  networks: {
    myNetwork: {
      url: "http://localhost:5000"
    }
  }
  ...
};
```

### Account
An Account can be used to make proxy signed calls/transactions to other contracts.
It's usage is exemplified in [here](https://github.com/Shard-Labs/starknet-hardhat-example/blob/plugin/test/account-test.ts)
Currently only the OpenZeppelin Account implementation is supported, and you are required to have the source files in your project.

You can choose to deploy a new Account, or use an existing one.

To deploy a new Account, use the `starknet` object's `deployAccountFromABI` method:
```javascript
function deployAccountFromABI: (
                accountContract: string,
                accountType: AccountImplementationType
            )
```
  - `accountContract` is the is the **name** or the **path** of the source of the Account contract, just like in `getContractFactory`.
  - `accountType` is the implementation of the Account that you want to use. Currently only "OpenZeppelin" is supported.
```javascript
account = await starknet.deployAccountFromABI("Account", "OpenZeppelin");
```

To retrieve an already deployed Account, use the `starknet` object's `getAccountFromAddress` method:
```javascript
function getAccountFromAddress: (
                accountContract: string,
                address: string,
                privateKey: string,
                accountType: AccountImplementationType
            )
```
  - `accountContract` is the is the **name** or the **path** of the source of the Account contract, just like in `getContractFactory`.
  - `address` is the address where the account you want to use is deployed.
  - `privateKey` is the account's private key.
  - `accountType` is the implementation of the Account that you want to use. Currently only "OpenZeppelin" is supported.

```javascript
const account = await starknet.getAccountFromAddress("Account", accountAddress, process.env.PRIVATE_KEY, "OpenZeppelin");
```

You can then use the Account object to call and invoke your contracts using the `invoke` and `call` methods, that take as arguments the target contract, function name, and arguments:
```javascript
const { res: currBalance } = await account.call(contract, "get_balance");
await account.invoke(contract, "increase_balance", { amount1, amount2 });
```


### Wallet
To configure a wallet for your project, specify it by using `wallets["walletName"]`.
You can specify multiple wallets/accounts.

The parameters for the wallet are:
  - `accountName`: The name to give the account. If omitted, the default value `__default__ ` will be used;
  - `modulePath`: The python module and wallet class of your chosen wallet provider;
  - `accountPath`: The path where your wallet information will be saved.

```javascript
module.exports = {
  starknet: {
    wallets: {
      MyWallet: {
        accountName: "OpenZeppelin",
        modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
        accountPath: "~/.starknet_accounts"
      },
      AnotherWallet: {
        accountName: "AnotherOpenZeppelin",
        modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
        accountPath: "~/.starknet_accounts"
      }
    }
  }
  ...
};
```
Accounts are deployed in the same network as the one passed as an argument to the `npx hardhat starknet-deploy-account` CLI command.

To use the wallet in your scripts, use the `getWallet` utility function:
```typescript
import { starknet } from "hardhat";
...
const wallet = starknet.getWallet("MyWallet");
const contract = ...;
await contract.invoke("increase_balance", { amount: 1 }, { wallet });
```

## More examples
An example Hardhat project using this plugin can be found [here](https://github.com/Shard-Labs/starknet-hardhat-example).
