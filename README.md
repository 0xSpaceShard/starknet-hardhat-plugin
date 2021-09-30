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

## Test
To test Starknet contracts with Mocha, use the regular Hardhat `test` task:
```
npx hardhat test
```

Inside the tests, use the following syntax:
```javascript
const { expect } = require("chai");
const { getStarknetContract } = require("hardhat");

describe("Starknet", function () {
  this.timeout(300_000); // 5 min
  it("Should work", async function () {
    const contract = await getStarknetContract("MyContract"); // assumes there is a file MyContract.cairo
    await contract.deploy();
    console.log("Deployed at", contract.address);
    await contract.invoke("increase_balance", [10]); // invoke method by name and pass arguments in an array
    await contract.invoke("increase_balance", [20]);

    const balanceStr = await contract.call("get_balance"); // call method by name and receive the result (string)
    const balance = parseInt(balanceStr);
    expect(balance).to.equal(30);
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
    // Defaults to "latest"
    version: "0.4.1"
  }
  ...
};
```

### Testing network
```javascript
module.exports = {
  ...
  networks: {
    myNetwork: {
      url: "http://my.network:8080"
    }
  },
  mocha: {
    // Used for deployment in tests
    // Defaults to "alpha"
    starknetNetwork: "myNetwork"
  }
  ...
};
```

## Example
An example Hardhat project using this plugin can be found [here](https://github.com/Shard-Labs/starknet-hardhat-example).
