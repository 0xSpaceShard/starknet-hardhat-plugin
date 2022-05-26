[![npm package](https://img.shields.io/npm/v/@shardlabs/starknet-hardhat-plugin?color=blue)](https://www.npmjs.com/package/@shardlabs/starknet-hardhat-plugin)

If you've used Hardhat 👷‍♀️👷‍♂️ and want to develop for Starknet <img src="https://starkware.co/wp-content/uploads/2021/07/Group-177.svg" alt="starknet" width="18"/>, this plugin might come in hand. If you've never set up a Hardhat project, check out [this guide](https://hardhat.org/tutorial/creating-a-new-hardhat-project.html).

## Contents

-   [Install](#install)
-   [CLI commands](#cli-commands)
-   [API](#api)
-   [Testing](#test)
    -   [Important notes](#important-notes)
    -   [Examples](#test-examples)
    -   [Devnet examples](#devnet-examples)
-   [Configure the plugin](#configure-the-plugin)
-   [Account support](#account)
-   [More examples](#more-examples)

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

-   Node.js v14.17.3
-   npm/npx v7.19.1
-   Docker v20.10.8 (optional):
    -   Since plugin version 0.3.4, Docker is no longer necessary if you opt for a Python environment (more info in [Config](#cairo-version)).
    -   If you opt for the containerized version, make sure you have a running Docker daemon.
    -   If you're experiencing Docker access issues, check [this](https://stackoverflow.com/questions/52364905/after-executing-following-code-of-dockerode-npm-getting-error-connect-eacces-v).
-   Linux / macOS:
    -   On Windows, we recommend using WSL 2.

## CLI commands

This plugin defines the following Hardhat commands (also called tasks):

### `starknet-compile`

```
npx hardhat starknet-compile [PATH...] [--cairo-path "<LIB_PATH1>:<LIB_PATH2>:..."] [--account-contract] [--disable-hint-validation]
```

If no paths are provided, all Starknet contracts in the default contracts directory are compiled. Paths can be files and directories.

`--cairo-path` allows specifying the locations of imported files, if necessary. Separate them with a colon (:), e.g. `--cairo-path='path/to/lib1:path/to/lib2'`

`--account-contract` allows compiling an account contract.

`--disable-hint-validation` allows compiling a contract without hint validation (any python code is allowed in hints, ex: print ...).

### `starknet-deploy`

```
npx hardhat starknet-deploy [--starknet-network <NAME>] [--wait] [--gateway-url <URL>] [ARTIFACT_PATH...] [--inputs <CONSTRUCTOR_ARGUMENTS>] [--salt <SALT>]
```

If no paths are provided, all Starknet artifacts from the default artifacts directory are deployed. Paths can be files and directories.

If you're passing constructor arguments, pass them space separated, but as a single string (due to limitations of the plugin system).

If the `--wait` flag is passed, the task will wait until the transaction status of the deployment is one of (`PENDING`, `ACCEPTED_ON_L2`, `ACCEPTED_ON_L1`).

The `--salt` parameter should be a hex string which, when provided, causes the contract to always be deployed to the same address.

The `--token` parameter indicates that your deployment is whitelisted on alpha-mainnet.

Notice that this plugin relies on `--starknet-network` (or `STARKNET_NETWORK` environment variable) and not on Hardhat's `--network`. So if you define

```javascript
module.exports = {
    networks: {
        myNetwork: {
            url: "http://127.0.0.1:5050"
        }
    }
};
```

you can use it by calling `npx hardhat starknet-deploy --starknet-network myNetwork`.

The Alpha networks and integrated Devnet are available by default, you don't need to define them in the config file; just pass:

-   `--starknet-network alpha` or `--starknet-network alpha-goerli` for Alpha Testnet (on Goerli)
-   `--starknet-network alpha-mainnet` for Alpha Mainnet
-   `--starknet-network integrated-devnet` for integrated Devnet (experimental)

```
npx hardhat starknet-deploy starknet-artifacts/contract.cairo/ --inputs "1 2 3"
```

You would typically use the input feature when deploying a single contract requiring constructor arguments. If you are deploying multiple contracts, they'll all use the same input.

### `starknet-verify`

```
npx hardhat starknet-verify [--starknet-network <NAME>] [--path <PATH>] [<DEPENDENCY_PATH> ...] [--address <CONTRACT_ADDRESS>]
```

Queries [Voyager](https://voyager.online/) to [verify the contract](https://voyager.online/verifyContract) deployed at `<CONTRACT_ADDRESS>` using the source files at `<PATH>` and any number of `<DEPENDENCY_PATH>`.

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
npx hardhat starknet-call [--starknet-network <NAME>] [--gateway-url <URL>] [--contract <CONTRACT_NAME>] [--address <CONTRACT_ADDRESS>] [--function <FUNCTION_NAME>] [--inputs <FUNCTION_INPUTS>] [--signature <INVOKE_SIGNATURE>] [--wallet <WALLET_NAME>] [--block-number <BLOCK_NUMBER>]
```

Calls a function on the target contract and returns its return value.
If the function takes any inputs, they should be passed as a single string, separated by space.
The pending block will always be queried by default, and if there's no pending block, the default behaviour is to query the last block. Using the `--block-number` argument will query the specified block.
If the wallet argument is passed, the wallet `wallets["WALLET_NAME"]` configured in the `hardhat.config` file will be used. If omitted, the Starknet argument `--no_wallet` will be used by default.

```
npx hardhat starknet-call --starknet-network myNetwork --contract contract --function sum_points_to_tuple --address $CONTRACT_ADDRESS --inputs "10 20 30 40"
```

### `starknet-estimate-fee`

```
npx hardhat starknet-estimate-fee [--starknet-network <NAME>] [--gateway-url <URL>] [--contract <CONTRACT_NAME>] [--address <CONTRACT_ADDRESS>] [--function <FUNCTION_NAME>] [--inputs <FUNCTION_INPUTS>] [--signature <INVOKE_SIGNATURE>] [--wallet <WALLET_NAME>] [--block-number <BLOCK_NUMBER>]
```

Estimates the gas fee of a function execution.

### `run`

No CLI options introduced to the original `hardhat run`, but a starknet network can be specified using the config file. See [Runtime network](#runtime-network).

### `test`

Introduces the `--starknet-network` option to the existing `hardhat test` task.

## API

Adding this plugin to your project expands Hardhat's runtime with a `starknet` object. It can be imported with:

```typescript
import { starknet } from "hardhat";
// or
const starknet = require("hardhat").starknet;
```

To see all the utilities introduced by the `starknet` object, check [this](src/type-extensions.ts#L104) out.

## Testing

Relying on the above described API makes it easier to interact with your contracts and test them.

To test Starknet contracts with Mocha, use the regular Hardhat `test` task which expects test files in your designated test directory:

```
npx hardhat test
```

Read more about the network used in tests in the [Runtime network](#runtime-network) section.
These examples are inspired by the official [Starknet Python tutorial](https://www.cairo-lang.org/docs/hello_starknet/unit_tests.html).

### Important notes

-   `BigInt` is used because `felt` may be too big for javascript. Use it like `BigInt("10")` or, since ES2020, like `10n`.
-   All function names, argument names and return value names should be referred to by the names specified in contract source files.
-   The argument of `getContractFactory` is the **name** or the **path** of the source of the target contract:
    -   if providing a path, it should be relative to the project root or the contracts directory:
        -   `getContractFactory("contracts/subdir/MyContract.cairo")`
        -   `getContractFactory("subdir/MyContract.cairo")`
    -   the extension can be omitted:
        -   `getContractFactory("subdir/MyContract")`
        -   `getContractFactory("MyContract")`

### Test examples

#### Setup

```typescript
import { expect } from "chai";
import { starknet } from "hardhat";
// or
const expect = require("chai").expect;
const starknet = require("hardhat").starknet;

describe("My Test", function () {
  this.timeout(300_000); // 5 min - recommended if used with Alpha testnet
  // this.timeout(30_000); // 30 seconds - recommended if used with starknet-devnet
```

#### Deploy / load contract

```typescript
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
```

#### Arrays

```typescript
/**
 * Assumes there is a file MyContract.cairo whose compilation artifacts have been generated.
 * The contract is assumed to have:
 * - view function sum_array(a_len: felt, a: felt*) -> (res: felt)
 */
it("should work with arrays", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy(); // no constructor -> no constructor arguments
    const { res } = await contract.call("sum_array", { a: [1, 2, 3] });
    expect(res).to.deep.equal(BigInt(6));
});
```

#### Tuples

```typescript
/**
 * Assumes there is a file MyContract.cairo whose compilation artifacts have been generated.
 * The contract is assumed to have:
 * - view function sum_pair(pair: (felt, felt)) -> (res: felt)
 */
it("should work with tuples", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy();
    // notice how the pair tuple is passed as javascript array
    const { res } = await contract.call("sum_pair", { pair: [10, 20] });
    expect(res).to.deep.equal(BigInt(30));
});
```

#### Accounts

More detailed documentation can be found [here](#account).

```typescript
  /**
   * Assumes there is a file MyContract.cairo, together with OpenZeppelin Account.cairo file and its dependencies.
   * Assumes their compilation artifacts have been generated.
   * MyContract is assumed to have:
   * - external function increase_balance(amount: felt) -> ()
   * - view function get_balance() -> (res: felt)
   */
  it("should succeed when using the account to invoke a function on another contract", async function() {
    const contractFactory = await starknet.getContractFactory("MyContract");
    const contract = await contractFactory.deploy()

    const account = await starknet.deployAccount("OpenZeppelin");
    // or
    const account = await starknet.getAccountFromAddress(accountAddress, process.env.PRIVATE_KEY, "OpenZeppelin");
    console.log("Account:", account.address, account.privateKey, account.publicKey);

    const { res: currBalance } = await account.call(contract, "get_balance");
    const amount = BigInt(10);
    await account.invoke(contract, "increase_balance", { amount });

    const { res: newBalance } = await account.call(contract, "get_balance");
    expect(newBalance).to.deep.equal(currBalance + amount);
  });
});
```

#### Fee estimation

```typescript
it("should estimate fee", async function () {
    const fee = contract.estimateFee("increase_balance", { amount: 10n });
    console.log("Estimated fee:", fee.amount, fee.unit);
});
```

#### Transaction information and receipt with events

```typescript
it("should return transaction data and transaction receipt", async function () {
    const contract: StarknetContract = await contractFactory.deploy();
    console.log("Deployment transaction hash:", contract.deployTxHash);

    const transaction = await starknet.getTransaction(contract.deployTxHash);
    console.log(transaction);

    const txHash = await contract.invoke("increase_balance", { amount: 10 });

    const receipt = await starknet.getTransactionReceipt(txHash);
    console.log(receipt.events);
});
```

For more usage examples, including tuple, array and struct support, as well as wallet support, check [sample-test.ts](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/sample-test.ts) of [starknet-hardhat-example](https://github.com/Shard-Labs/starknet-hardhat-example).

### Devnet examples

#### L1-L2 communication (Postman message exchange with Devnet)

Exchanging messages between L1 ([Ganache](https://www.npmjs.com/package/ganache), [Hardhat node](https://hardhat.org/hardhat-network/#running-stand-alone-in-order-to-support-wallets-and-other-software), Ethereum testnet) and L2 (only supported for [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet)) can be done using this plugin:

-   Ensure there is an available L1 network and that you know its RPC endpoint URL.
-   Load an L1 Messaging contract using `starknet.devnet.loadL1MessagingContract`.
-   Call `starknet.devnet.flush` after you `invoke` your contract and want to propagate your message.
-   When running a hardhat test or script which relies on `network["config"]`, specify the name of an L1 network you defined in `hardhat.config`. Use `npx hardhat test --network <NETWORK_NAME>`. Network `localhost` is predefined in hardhat so `--network localhost` should work if you're using e.g. `npx hardhat node` as the L1 network.
-   Check [this example](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/postman.test.ts#L98) for more info.

```typescript
  it("should exchange messages with Devnet", async function() {
    await starknet.devnet.loadL1MessagingContract(...);
    const l1contract = ...;
    const l2contract = ...;

    await l1contract.send(...); // depending on your L1 contract interaction library
    await starknet.devnet.flush();

    await l2contract.invoke(...);
    await starknet.devnet.flush();
  });
```

#### Restart

Devnet can be restarted by calling `starknet.devnet.restart()`. All of the deployed contracts, blocks and storage updates will be restarted to the empty state.

```typescript
await starknet.devnet.restart();
```

## Configure the plugin

Specify custom configuration by editing your project's `hardhat.config.ts` (or `hardhat.config.js`).

### Cairo version

Use this configuration option to select the `cairo-lang`/`starknet` version used by the underlying Docker container.

By default, the images are amd64 compliant. Append the `-arm` suffix to the version name to use an image adapted for arm64 architecture (e.g. `dockerizedVersion: "0.8.1-arm"`).

If you specify neither `dockerizedVersion` nor [venv](#existing-virtual-environment), the latest dockerized version is used.

A list of available dockerized versions can be found [here](https://hub.docker.com/r/shardlabs/cairo-cli/tags).

```javascript
module.exports = {
  starknet: {
    dockerizedVersion: "0.8.1"
  }
  ...
};
```

### Existing virtual environment

If you want to use an existing Python virtual environment (pyenv, poetry, conda, miniconda), specify it by using `starknet["venv"]`.

To use the currently activated environment (or if you have the starknet commands globally installed), set `venv` to `"active"`.

If you specify neither [dockerizedVersion](#cairo-version) nor `venv`, the latest dockerized version is used.

```typescript
module.exports = {
    starknet: {
        // venv: "active" <- for the active virtual environment
        // venv: "path/to/my-venv" <- for env created with e.g. `python -m venv path/to/my-venv`
        venv: "<VENV_PATH>"
    }
};
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

### Runtime network

To set the network used in your Hardhat scripts/tests, use `starknet["network"]`. Not specifying one will default to using Alpha testnet.

A faster approach is to use [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet), a Ganache-like local testnet.

```javascript
module.exports = {
  starknet: {
    network: "myNetwork"
  },
  networks: {
    myNetwork: {
      url: "http://127.0.0.1:5050"
    }
  }
  ...
};
```

### Runtime network - Integrated Devnet - Experimental

As an experimental feature, you can use [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet) as a network without the need to run it as a separate process. By default, it will use the latest Docker image of Devnet listening on `http://127.0.0.1:5050`.

Additionaly, by defining `networks["integratedDevnet"]`, you can specify:

-   a Python environment with starknet-devnet preinstalled
-   a different Docker image.

```javascript
module.exports = {
  starknet: {
    network: "integrated-devnet"
  },
  networks: {
    integratedDevnet: {
      url: "http://127.0.0.1:5050",

      // venv: "active" <- for the active virtual environment
      // venv: "path/to/my-venv" <- for env created with e.g. `python -m venv path/to/my-venv`
      venv: "<VENV-PATH>",

      // or specify Docker image tag
      dockerizedVersion: "0.1.18"
    }
  }
  ...
};
```

### Wallet

To configure a wallet for your project, specify it by adding an entry to `wallets` in your hardhat config file.
You can specify multiple wallets/accounts.

The parameters for the wallet are:

-   `accountName`: The name to give the account. If omitted, the default value `__default__` will be used;
-   `modulePath`: The python module and wallet class of your chosen wallet provider;
-   `accountPath`: The path where your wallet information will be saved.

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

## Account

An Account can be used to make proxy signed calls/transactions to other contracts.
Its usage is exemplified [earlier in the docs](#accounts) and [in the example repo](https://github.com/Shard-Labs/starknet-hardhat-example/blob/plugin/test/oz-account-test.ts).

You can choose to deploy a new Account, or use an existing one.

To deploy a new Account, use the `starknet` object's `deployAccount` method:

```typescript
function deployAccount(accountType: AccountImplementationType, options?: DeployAccountOptions);
```

-   `accountType` - the implementation of the Account that you want to use; currently supported implementations:
    -   `"OpenZeppelin"`- [v0.1.0](https://github.com/OpenZeppelin/cairo-contracts/releases/tag/v0.1.0)
    -   `"Argent"` - [v0.2.1](https://github.com/argentlabs/argent-contracts-starknet/releases/tag/v0.2.1)
-   `options` - optional deployment parameters:
    -   `salt` - for fixing the account address
    -   `privateKey` - if you don't provide one, it will be randomly generated
    -   `token` - for indicating that the account is whitelisted on alpha-mainnet

Use it like this:

```typescript
const account = await starknet.deployAccount("OpenZeppelin");
const accountWithPredefinedKey = await starknet.deployAccount("OpenZeppelin", {
    privateKey: process.env.MY_KEY
});
```

To retrieve an already deployed Account, use the `starknet` object's `getAccountFromAddress` method:

```typescript
function getAccountFromAddress(
    address: string,
    privateKey: string,
    accountType: AccountImplementationType
);
```

-   `address` is the address where the account you want to use is deployed.
-   `privateKey` is the account's private key.
-   `accountType` is the implementation of the Account that you want to use.

```typescript
const account = await starknet.getAccountFromAddress(
    accountAddress,
    process.env.PRIVATE_KEY,
    "OpenZeppelin"
);
```

You can then use the Account object to call and invoke your contracts using the `invoke` and `call` methods, that take as arguments the target contract, function name, and arguments:

```typescript
const { res: amount } = await account.call(contract, "get_balance");
await account.invoke(contract, "increase_balance", { amount });
```

You can also use the Account object to perform multi{calls, invokes, fee estimations}.

```typescript
const interactionArray = [
    {
        toContract: contract1,
        functionName: "increase_balance",
        calldata: { amount: 10n }
    },
    {
        toContract: contract2,
        functionName: "increase_balance",
        calldata: { amount: 20n }
    }
];
const fee = await account.multiEstimateFee(interactionArray);
const txHash = await account.multiInvoke(interactionArray);
const results = await account.multiCall(interactionArray);
```

OpenZeppelin and Argent account implementation work almost the same: Argent implementation has the additional Guardian signature verification.
A key pair is generated for the Guardian the same way it is for the Signer, however if you want to change it, you must cast the `account` object to `ArgentAccount`.

```typescript
import { ArgentAccount } from "@shardlabs/starknet-hardhat-plugin/dist/account";

const account: ArgentAccount = (await starknet.deployAccount("Argent")) as ArgentAccount;

// or

const loadedAccount = (await starknet.getAccountFromAddress(
    accountAddress,
    privateKey,
    "Argent"
)) as ArgentAccount;
```

## More examples

An example Hardhat project using this plugin can be found [here](https://github.com/Shard-Labs/starknet-hardhat-example).
