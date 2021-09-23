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
```shell
npx hardhat starknet-compile
```

### `starknet-deploy` (with optional flags)
```shell
npx hardhat starknet-deploy --starknet-network <NAME> --gateway-url <URL>
```

## Test
To test Starknet contracts with Mocha, use the regular Hardhat `test` task:
```shell
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
Specify custom configurations by editing your project's `hardhat.config.js` (or .ts).

### Artifacts path
- Defaults to `starknet-artifacts`
- Has to be different from the value used by `paths.artifacts` (which is `artifacts` by default).
```javascript
module.exports = {
  paths: {
    starknetArtifacts: "my-starknet-path"
  }
};
```
