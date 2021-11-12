## Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8:
  - Make sure you have a running Docker daemon.
- Linux OS:
  - For developers using Windows, the recommended way is to use WSL 2.

## Install
```
npm install @shardlabs/starknet-hardhat-plugin
```

## Use
This plugin adds the following tasks which target the default source/artifact/test directories of your Hardhat project:
### `starknet-compile`
```
npx hardhat starknet-compile [PATH...] [--cairo-path "<PATH1>:<PATH2>:..."]
```
If no paths are provided, all Starknet contracts in the default contracts directory are compiled. Paths can be files and directories.

`--cairo-path` allows specifying the locations of imported files, if necessary. Separate them with a colon (:), e.g. `--cairo-path='path/to/lib1:path/to/lib2'`

### `starknet-deploy` (with optional flags)
```
npx hardhat starknet-deploy [--starknet-network <NAME>] [--gateway-url <URL>] [ARTIFACT_PATH...]
```
If no paths are provided, all Starknet artifacts in the default artifacts directory are deployed. Paths can be files and directories.

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

The `alpha` testnet is available by default, you don't need to specify it.

## Test
To test Starknet contracts with Mocha, use the regular Hardhat `test` task:
```
npx hardhat test
```

Read more about the network used in tests in the [Testing network](#testing-network) section.

Inside the tests, use the following *modus operandi* (comparable to the [official Python tutorial](https://www.cairo-lang.org/docs/hello_starknet/unit_tests.html)).

All function names, argument names and return value names should be referred to as specified in contract source files.

`BigInt` is used because `felt` may be too big for javascript. Use BigInt like `BigInt(10)` or `10n`.
```javascript
const { expect } = require("chai");
const { starknet } = require("hardhat");

describe("Starknet", function () {
  this.timeout(300_000); // 5 min
  it("should work for a fresh deployment", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract"); // assumes there is a file MyContract.cairo
    const contract = await contractFactory.deploy({ initial_balance: 10 });
    console.log("Deployed at", contract.address);

    await contract.invoke("increase_balance", { amount: 10 }); // invoke method by name and pass arguments by name
    await contract.invoke("increase_balance", { amount: 20 });

    const { res: balance } = await contract.call("get_balance"); // call method by name and receive the result by name
    expect(balance).to.deep.equal(BigInt(40)); // depending on es version, you could also use 40n instead of BigInt(40)
  });

  it("should work for a previously deployed contract", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract"); // assumes there is a file MyContract.cairo
    const contract = contractFactory.getContractAt("0x123..."); // you might wanna put an actual address here
    await contract.invoke(...);
  });

  it("should work with signed transactions", async function() {
    const authContractFactory = await starknet.getContractFactory("MyAuthContract"); // assumes there is a file MyAuthContract.cairo
    const publicKey = BigInt("987...");
    const contract = await authContractFactory.deploy({ lucky_user: publicKey, initial_balance: 10 });

    // signature is calculated for each transaction according to `publicKey` used and `amount` passed
    const signature = [
      BigInt("123..."),
      BigInt("456...")
    ]

    await contract.invoke("increase_balance", { user: publicKey, amount: 20 }, signature);

    const { res: balance } = await contract.call("get_balance", { user: publicKey });
    expect(balance).to.deep.equal(BigInt(30));
  });
});
```

For more usage examples, check [sample-test.ts](https://github.com/Shard-Labs/starknet-hardhat-example/blob/master/test/sample-test.ts) from [starknet-hardhat-example](https://github.com/Shard-Labs/starknet-hardhat-example).

## Config
Specify custom configuration by editing your project's `hardhat.config.js` (or .ts).

### Paths
```javascript
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
If you don't specify a `mocha.starknetNetwork`, the program defaults to using the alpha testnet for Mocha tests.

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
