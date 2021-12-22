[![npm package](https://img.shields.io/npm/v/@shardlabs/starknet-hardhat-plugin?color=green)](https://www.npmjs.com/package/@shardlabs/starknet-hardhat-plugin)

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
```

### Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8 (optional):
  - Since plugin version 0.3.4, Docker is no longer necessary if you opt for a Python environment (more info in [Config](#cairo-version)).
  - If you opt for the containerized version, make sure you have a running Docker daemon.
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
npx hardhat starknet-deploy [--starknet-network <NAME>] [--wait] [--gateway-url <URL>] [ARTIFACT_PATH...] [--inputs <SINGLE_STRING_OF_SPACE_SEPARATED_VALUES>]
```
If no paths are provided, all Starknet artifacts from the default artifacts directory are deployed. Paths can be files and directories.

If the "--wait" flag is passed, the task will wait until the transaction status of the deployment is "PENDING" before ending.

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

If you're passing constructor arguments, pass them space separated, but as a single string (due to limitations of the plugin system).
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

## API
Adding this plugin to your project expands Hardhat's runtime with a `starknet` object. It can be imported with:
```typescript
import { starknet } from "hardhat";
```
To see all the utility functions this object introduces, check [this](src/type-extensions.ts) out.

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


### Test examples
```typescript
import { expect } from "chai";
import { starknet } from "hardhat";

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
   * Assumes there is a file MyAuthContract.cairo whose compilation artifacts have been generated.
   * The contract is assumed to have:
   * - constructor function constructor(lucky_user: felt, initial_balance: felt)
   * - external function increase_balance(user: felt, amount: felt) -> (res: felt)
   * - view function get_balance(user: felt) -> (res: felt)
   * 
   * increase_balance checks if the transaction invoking it was signed by the user whose public key is passed in
   */
  it("should work with signed transactions", async function() {
    const authContractFactory = await starknet.getContractFactory("MyAuthContract");
    const publicKey = BigInt("987...");
    const contract = await authContractFactory.deploy({ lucky_user: publicKey, initial_balance: 10 });

    // signature is calculated for each transaction according to `publicKey` used and `amount` passed
    const signature = [BigInt("123..."), BigInt("456...")];
    await contract.invoke("increase_balance", { user: publicKey, amount: 20 }, signature);

    // notice how `res` is mapped to `balance`
    const { res: balance } = await contract.call("get_balance", { user: publicKey });
    expect(balance).to.deep.equal(BigInt(30));
  });
});
```

For more usage examples, including tuple, array and struct support, check [sample-test.ts](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/sample-test.ts) of [starknet-hardhat-example](https://github.com/Shard-Labs/starknet-hardhat-example).

## Configure the plugin
Specify custom configuration by editing your project's `hardhat.config.ts` (or `hardhat.config.js`).

### Cairo version
Use this configuration option to select the `cairo-lang`/`starknet` version used by the underlying Docker container. If you specify neither `version` nor [venv](#existing-virtual-environment), the latest dockerized version is used.

A list of available versions can be found [here](https://hub.docker.com/r/shardlabs/cairo-cli/tags).
```javascript
module.exports = {
  cairo: {
    // The default in this version of the plugin
    version: "0.6.2"
  }
  ...
};
```

### Existing virtual environment
If you want to use an existing Python virtual environment, specify it by using `cairo["venv"]`.

To use the currently activated environment (or if you have the starknet commands globally installed), set `venv` to `"active"`.
```typescript
module.exports = {
  cairo: {
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
  }
  ...
};
```

### Testing network
To set the network used in your Mocha tests, use `mocha["starknetNetwork"]`. Not specifying one will default to using Alpha testnet.

A faster approach is to use [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet), a Ganache-like local testnet.

```javascript
module.exports = {
  networks: {
    myNetwork: {
      url: "http://localhost:5000"
    }
  },
  mocha: {
    // Used for deployment in Mocha tests
    // Defaults to "alpha" (for Alpha testnet), which is preconfigured even if you don't see it under `networks:`
    starknetNetwork: "myNetwork"
  }
  ...
};
```

## More examples
An example Hardhat project using this plugin can be found [here](https://github.com/Shard-Labs/starknet-hardhat-example).
