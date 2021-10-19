## Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8

## Install
```
npm install @shardlabs/starknet-hardhat-plugin
```

## Use
This plugin adds the following tasks which target the default source/artifact/test directories of your Hardhat project:
### `starknet-compile`
```
npx hardhat starknet-compile [PATH...]
```
If no paths are provided, all Starknet contracts in the default contracts directory are compiled. Paths can be files and directories.

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

Inside the tests, use the following *modus operandi* (comparable to the [official Python tutorial](https://www.cairo-lang.org/docs/hello_starknet/unit_tests.html)):
```javascript
const { expect } = require("chai");
const { starknet } = require("hardhat");

describe("Starknet", function () {
  this.timeout(300_000); // 5 min
  it("should work for a fresh deployment", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract"); // assumes there is a file MyContract.cairo
    const contract = await contractFactory.deploy();
    console.log("Deployed at", contract.address);
    await contract.invoke("increase_balance", [10]); // invoke method by name and pass arguments in an array
    await contract.invoke("increase_balance", [20]);

    const balanceStr = await contract.call("get_balance"); // call method by name and receive the result (string)
    const balance = parseInt(balanceStr);
    expect(balance).to.equal(30);
  });

  it("should work for a previously deployed contract", async function () {
    const contractFactory = await starknet.getContractFactory("MyContract"); // assumes there is a file MyContract.cairo
    const contract = contractFactory.getContractAt("0x123..."); // you might wanna put an actual address here
    await contract.invoke(...);
  });
});
```

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
    // Defaults to the latest version
    version: "0.4.2"
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
