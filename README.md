## Requirements
This plugin was tested with:
- Node.js v12.22.4
- npm/npx v7.21.1
- Docker v20.10.8

## Install
As this is an early stage of the project, you need to build the plugin locally with:
```shell
npm run build
```

Assuming you have initialized a Hardhat project in which you wish to include this plugin, the next step would be to add to your project's `hardhat.config.js` (or .ts) the following line, targeting the path of the built plugin:
```javascript
require("<your_path>/starknet-hardhat-plugin/dist/index");
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

### `starknet-test`
```shell
npx hardhat starknet-test
```
