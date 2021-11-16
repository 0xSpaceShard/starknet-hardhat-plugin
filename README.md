## Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8:
  - Make sure you have a running Docker daemon.
- Linux / macOS:
  - on Windows, we recommend using WSL 2.

## Install
```
npm install @shardlabs/starknet-hardhat-plugin
```

## Use
This plugin adds the following tasks which target the source/artifact/test directories of your Hardhat project:
### `starknet-compile`
```
npx hardhat starknet-compile [PATH...] [--cairo-path "<LIB_PATH1>:<LIB_PATH2>:..."]
```
If no paths are provided, all Starknet contracts in the default contracts directory are compiled. Paths can be files and directories.

`--cairo-path` allows specifying the locations of imported files, if necessary. Separate them with a colon (:), e.g. `--cairo-path='path/to/lib1:path/to/lib2'`

### `starknet-deploy`
```
npx hardhat starknet-deploy [--starknet-network <NAME>] [--gateway-url <URL>] [ARTIFACT_PATH...]
```
If no paths are provided, all Starknet artifacts from the default artifacts directory are deployed. Paths can be files and directories.

Notice that this plugin relies on `--starknet-network` and not on Hardhat's `--network`. So if you specify
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

The Alpha testnet is available by default, you don't need to specify it.

## Test
To test Starknet contracts with Mocha, use the regular Hardhat `test` task which expects test files in your designated test directory:
```
npx hardhat test
```

Read more about the network used in tests in the [Testing network](#testing-network) section.

These examples are inspired by the [official Python tutorial](https://www.cairo-lang.org/docs/hello_starknet/unit_tests.html).

All function names, argument names and return value names should be referred to by the names specified in contract source files.

`BigInt` is used because `felt` may be too big for javascript. Use `BigInt` like `BigInt("10")` or `10n`.

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
    expect(res).to.deep.equal(BigInt(40)); // since ECMAScript 2020, you can also use 40n instead of BigInt(40)
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
    const signature = [
      BigInt("123..."),
      BigInt("456...")
    ];

    await contract.invoke("increase_balance", { user: publicKey, amount: 20 }, signature);

    // notice how `res` is mapped to `balance`
    const { res: balance } = await contract.call("get_balance", { user: publicKey });
    expect(balance).to.deep.equal(BigInt(30));
  });
});
```

For more usage examples, including tuple, array and struct support, check [sample-test.ts](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/sample-test.ts) of [starknet-hardhat-example](https://github.com/Shard-Labs/starknet-hardhat-example).

## Config
Specify custom configuration by editing your project's `hardhat.config.ts` (or `hardhat.config.js`).

### Paths
```typescript
module.exports = {
  ...
  paths: {
    // Defaults to "contracts" (the same as `paths.sources`).
    starknetSources: "my-own-starknet-path",

    // Defaults to "starknet-artifacts".
    // Has to be different from the value used by `paths.artifacts` (which is `artifacts` by default).
    starknetArtifacts: "also-my-own-starknet-path",
  }
  ...
};
```

### Cairo version
A list of available versions can be found [here](https://hub.docker.com/r/shardlabs/cairo-cli/tags).
```javascript
module.exports = {
  ...
  cairo: {
    // The default in this version of the plugin
    version: "0.5.2"
  }
  ...
};
```

### Testing network
If you don't specify a `mocha.starknetNetwork`, the program defaults to using the Alpha testnet for Mocha tests.

A faster approach, but still in beta-phase, is to use [starknet-devnet](https://github.com/Shard-Labs/starknet-devnet), a Ganache-like local testnet.

```javascript
module.exports = {
  ...
  networks: {
    myNetwork: {
      url: "http://localhost:5000"
    }
  },
  mocha: {
    // Used for deployment in Mocha tests
    // Defaults to "alpha", which is preconfigured even if you don't see it under `networks:`
    starknetNetwork: "myNetwork"
  }
  ...
};
```

## Example
An example Hardhat project using this plugin can be found [here](https://github.com/Shard-Labs/starknet-hardhat-example).
